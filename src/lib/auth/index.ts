import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { validateSignIn, validateSignUp, type SignUpInput } from "./credentials";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";

export { getCurrentUser, requireUser, destroyCurrentSession } from "./session";
export { SESSION_COOKIE } from "./cookie";
export type { CurrentUser } from "./session";

export type AuthResult =
  | { ok: true; message?: string }
  | { ok: false; message?: string; errors?: Record<string, string> };

/** hash หลอกๆ ที่ใช้เผาเวลาให้เท่ากับเคสที่เจอ user จริง
 *  ถ้าไม่ทำ การตอบเร็ว/ช้า จะบอกคนนอกได้ว่าอีเมลนี้มีบัญชีอยู่หรือไม่ */
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAA=";

export async function registerUser(input: SignUpInput): Promise<AuthResult> {
  const validated = validateSignUp(input);
  if (!validated.ok) return { ok: false, errors: validated.errors };

  const { email, password, displayName } = validated.value;

  try {
    // ยังไม่ createSession ให้ — บัญชีสมัครใหม่ต้องรอแอดมิน approve (isApproved) ก่อนเข้าใช้งานได้
    await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), displayName },
      select: { id: true },
    });
    return { ok: true, message: "สมัครสำเร็จ — รอแอดมินอนุมัติบัญชีก่อนจึงจะเข้าสู่ระบบได้" };
  } catch (error) {
    // P2002 = unique constraint ชน = อีเมลนี้สมัครไปแล้ว
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return { ok: false, errors: { email: "อีเมลนี้สมัครไว้แล้ว — ลองเข้าสู่ระบบ" } };
    throw error;
  }
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const validated = validateSignIn(input);
  if (!validated.ok) return { ok: false, errors: validated.errors };

  const { email, password } = validated.value;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, isApproved: true },
  });

  const matches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  // ข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผิด — ไม่บอกใบ้ว่าอีเมลไหนมีอยู่จริง
  if (!user || !matches)
    return { ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };

  // ผ่านรหัสมาแล้วถึงค่อยเช็ค approve — ไม่งั้นคนที่เดารหัสมั่วจะรู้ว่าอีเมลนี้สมัครไว้จริง
  if (!user.isApproved)
    return { ok: false, message: "บัญชีนี้ยังไม่ได้รับการอนุมัติจากแอดมิน กรุณารอก่อนเข้าสู่ระบบ" };

  await createSession(user.id);
  return { ok: true };
}
