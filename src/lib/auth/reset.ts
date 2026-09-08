import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type Validated,
} from "./credentials";

/** ลิงก์ reset อายุ 1 ชั่วโมง — สั้นพอที่ถ้าอีเมลถูกอ่านทีหลังก็ใช้ไม่ได้
 *  แต่ยาวพอให้คนที่ไม่ได้เปิดมือถือตลอดยังทันกด */
export const RESET_TTL_MS = 60 * 60 * 1000;

/** ขอลิงก์ได้ 3 ครั้งต่ออีเมลต่อชั่วโมง
 *  ถ้าไม่จำกัด แอปเราจะกลายเป็นเครื่องมือยิงอีเมลรบกวนคนอื่นฟรีๆ */
export const MAX_RESET_REQUESTS = 3;
export const RESET_WINDOW_MS = 60 * 60 * 1000;

export type ResetRecord = { expiresAt: Date; usedAt: Date | null } | null;
export type ResetTokenStatus = "valid" | "missing" | "expired" | "used";

/** แยกสถานะ token ออกมาเป็น pure function เพื่อ test ทุกทางแยกได้โดยไม่ต้องมี DB
 *  ลำดับการตรวจ: missing → used → expired
 *  (ใช้แล้วสำคัญกว่าหมดอายุ เพราะบอกผู้ใช้ได้ตรงกว่าว่า "ลิงก์นี้ใช้ไปแล้ว") */
export function resetTokenStatus(record: ResetRecord, now: Date): ResetTokenStatus {
  if (!record) return "missing";
  if (record.usedAt) return "used";
  // <= ไม่ใช่ < : ครบเวลาพอดีถือว่าหมดแล้ว ไม่เผื่อให้
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

export function tooManyResetRequests(recentCount: number): boolean {
  return recentCount >= MAX_RESET_REQUESTS;
}

export function validateNewPassword(input: {
  password: string;
  confirm: string;
}): Validated<{ password: string }> {
  const errors: Record<string, string> = {};

  // ไม่ trim — ช่องว่างหัวท้ายเป็นส่วนหนึ่งของรหัสที่เจ้าตัวตั้งไว้
  const password = input.password ?? "";
  const confirm = input.confirm ?? "";

  if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
  else if (password.length > MAX_PASSWORD_LENGTH)
    errors.password = `รหัสผ่านยาวได้ไม่เกิน ${MAX_PASSWORD_LENGTH} ตัวอักษร`;
  // บ่นเรื่อง "ไม่ตรงกัน" เฉพาะเมื่อรหัสตัวแรกใช้ได้แล้ว ไม่ยัด error สองอันพร้อมกัน
  else if (password !== confirm) errors.confirm = "รหัสผ่านสองช่องไม่ตรงกัน";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { password } };
}
