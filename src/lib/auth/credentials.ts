export const MIN_PASSWORD_LENGTH = 8;
/** จำกัดความยาวรหัสผ่านเพราะ scrypt กิน CPU/RAM ตามขนาด input
 *  ถ้าไม่จำกัด คนยิงรหัส 10MB รัวๆ จะทำให้ server ล่มได้ */
export const MAX_PASSWORD_LENGTH = 1024;
export const MAX_DISPLAY_NAME_LENGTH = 50;

/** ตรวจอีเมลแบบพอประมาณ: มี local@domain.tld ไม่มีช่องว่าง
 *  ไม่พยายาม regex ตาม RFC 5322 เพราะทำถูกยากและไม่ได้ช่วยอะไรจริง
 *  ตัวตัดสินสุดท้ายคือเจ้าของอีเมลนั้น login ได้หรือไม่ */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export type SignUpInput = {
  email: string;
  password: string;
  displayName?: string;
};

export type SignUpValue = {
  email: string;
  password: string;
  displayName: string;
};

export type SignInValue = {
  email: string;
  password: string;
};

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateSignUp(input: SignUpInput): Validated<SignUpValue> {
  const errors: Record<string, string> = {};

  const email = normalizeEmail(input.email ?? "");
  if (!email) errors.email = "กรุณาใส่อีเมล";
  else if (!EMAIL_RE.test(email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง";

  // ไม่ trim รหัสผ่าน — ช่องว่างหัวท้ายถือเป็นส่วนหนึ่งของรหัสที่เจ้าตัวตั้งไว้
  const password = input.password ?? "";
  if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
  else if (password.length > MAX_PASSWORD_LENGTH)
    errors.password = `รหัสผ่านยาวได้ไม่เกิน ${MAX_PASSWORD_LENGTH} ตัวอักษร`;

  const typedName = (input.displayName ?? "").trim();
  if (typedName.length > MAX_DISPLAY_NAME_LENGTH)
    errors.displayName = `ชื่อยาวได้ไม่เกิน ${MAX_DISPLAY_NAME_LENGTH} ตัวอักษร`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: { email, password, displayName: typedName || email.split("@")[0] },
  };
}

/** ตอน login เช็คแค่ว่ากรอกครบ ไม่บังคับกฎความยาว
 *  เพราะถ้าวันหน้าขึ้น MIN_PASSWORD_LENGTH คนที่สมัครไว้ก่อนต้องยัง login ได้ */
export function validateSignIn(input: {
  email: string;
  password: string;
}): Validated<SignInValue> {
  const errors: Record<string, string> = {};

  const email = normalizeEmail(input.email ?? "");
  const password = input.password ?? "";

  if (!email) errors.email = "กรุณาใส่อีเมล";
  if (!password) errors.password = "กรุณาใส่รหัสผ่าน";
  if (password.length > MAX_PASSWORD_LENGTH) errors.password = "รหัสผ่านไม่ถูกต้อง";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { email, password } };
}
