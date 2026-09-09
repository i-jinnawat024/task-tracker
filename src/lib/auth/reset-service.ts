import { prisma } from "@/lib/db/prisma";
import { appUrl, buildResetUrl, renderResetEmail, sendMail } from "@/lib/mail";
import { normalizeEmail } from "./credentials";
import { hashPassword, hashToken, newSessionToken } from "./password";
import {
  RESET_TTL_MS,
  RESET_WINDOW_MS,
  resetTokenStatus,
  tooManyResetRequests,
  validateNewPassword,
  type ResetTokenStatus,
} from "./reset";
import { createSession } from "./session";

/** ข้อความเดียวที่ผู้ใช้เห็นเสมอ ไม่ว่าอีเมลนั้นจะมีบัญชีหรือไม่ / ถูก rate limit หรือไม่
 *  ถ้าตอบต่างกัน คนนอกจะใช้หน้านี้ไล่เช็คได้ว่าอีเมลไหนสมัครไว้ */
export const GENERIC_RESET_MESSAGE =
  "ถ้าอีเมลนี้มีบัญชีอยู่ เราส่งลิงก์ตั้งรหัสใหม่ไปให้แล้ว — เช็คกล่องจดหมาย (รวมถึง spam)";

/** ขอลิงก์ตั้งรหัสใหม่
 *
 *  คืนค่าเหมือนกันทุกกรณีโดยเจตนา และ **ไม่คืน token/ลิงก์กลับไปที่ browser เด็ดขาด**
 *  ถ้าคืนไป ใครก็กรอกอีเมลคนอื่นแล้วได้ลิงก์ยึดบัญชีทันที
 *  ตอนยังไม่ตั้ง RESEND_API_KEY ลิงก์จะไปโผล่ที่ console ของ server เท่านั้น */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!email) return;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true },
  });
  if (!user) return;

  const recentCount = await prisma.passwordReset.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - RESET_WINDOW_MS) } },
  });
  if (tooManyResetRequests(recentCount)) {
    console.warn(`[reset] rate limit: ${email} ขอเกิน ${recentCount} ครั้งในหนึ่งชั่วโมง`);
    return;
  }

  const token = newSessionToken();
  await prisma.passwordReset.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const url = buildResetUrl(appUrl(), token);
  await sendMail({
    to: user.email,
    content: renderResetEmail({ url, displayName: user.displayName }),
    devFallbackUrl: url,
  });
}

/** ตรวจสถานะลิงก์ก่อนแสดงฟอร์ม เพื่อบอกผู้ใช้ทันทีว่าลิงก์หมดอายุ/ใช้แล้ว
 *  ดีกว่าให้กรอกรหัสใหม่เสร็จแล้วค่อยเด้ง error */
export async function checkResetToken(token: string): Promise<ResetTokenStatus> {
  if (!token) return "missing";
  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, usedAt: true },
  });
  return resetTokenStatus(record, new Date());
}

export const RESET_STATUS_MESSAGE: Record<Exclude<ResetTokenStatus, "valid">, string> = {
  missing: "ลิงก์นี้ใช้ไม่ได้ — ขอลิงก์ใหม่อีกครั้งนะ",
  expired: "ลิงก์หมดอายุแล้ว (ใช้ได้ 60 นาที) — ขอลิงก์ใหม่อีกครั้ง",
  used: "ลิงก์นี้ถูกใช้ตั้งรหัสไปแล้ว — ถ้ายังเข้าไม่ได้ให้ขอลิงก์ใหม่",
};

export type ApplyResetResult =
  | { ok: true }
  | { ok: false; message?: string; errors?: Record<string, string> };

class ResetAlreadyConsumedError extends Error {}

export async function applyPasswordReset(
  token: string,
  input: { password: string; confirm: string },
): Promise<ApplyResetResult> {
  const validated = validateNewPassword(input);
  if (!validated.ok) return { ok: false, errors: validated.errors };

  const tokenHash = hashToken(token);
  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true, usedAt: true },
  });

  const status = resetTokenStatus(record, new Date());
  if (status !== "valid" || !record) {
    // status === "valid" แต่ record เป็น null เกิดขึ้นไม่ได้ (resetTokenStatus คืน
    // "missing" เมื่อ record เป็น null) แต่เขียนให้ครบเพื่อไม่ต้อง cast type
    const reason = status === "valid" ? "missing" : status;
    return { ok: false, message: RESET_STATUS_MESSAGE[reason] };
  }

  const passwordHash = await hashPassword(validated.value.password);

  try {
    await prisma.$transaction(async (tx) => {
      // ล็อกแถว user ก่อน เพื่อเรียงคำขอของบัญชีเดียวกัน แม้ใช้คนละ token
      // ถ้ายึด token ไม่สำเร็จ ต้อง throw เพื่อ rollback รหัสผ่านด้วย
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      const now = new Date();
      const claimed = await tx.passwordReset.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new ResetAlreadyConsumedError();

      await tx.passwordReset.deleteMany({
        where: { userId: record.userId, usedAt: null },
      });
      await tx.session.deleteMany({ where: { userId: record.userId } });
    });
  } catch (error) {
    if (error instanceof ResetAlreadyConsumedError)
      return { ok: false, message: RESET_STATUS_MESSAGE.missing };
    throw error;
  }

  // เพิ่ง proof ว่าเข้าถึงอีเมลได้ ให้ล็อกอินต่อเลยไม่ต้องพิมพ์รหัสซ้ำ
  await createSession(record.userId);
  return { ok: true };
}
