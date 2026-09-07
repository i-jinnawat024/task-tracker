import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/** ห่อ callback ของ scrypt เอง ไม่ใช้ promisify() เพราะ overload ของ scrypt
 *  ทำให้ type ที่ promisify อนุมานได้รับแค่ 3 argument (ส่ง options ไม่ได้) */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) =>
      err ? reject(err) : resolve(derived),
    );
  });
}

/** พารามิเตอร์ scrypt — N คือ cost, ยิ่งสูงยิ่งช้าสำหรับคนเดารหัส
 *  16384/8/1 กิน RAM ~16MB ต่อการ hash หนึ่งครั้ง ใช้เวลา ~50-100ms บนเครื่องทั่วไป
 *  เก็บค่าพวกนี้ไว้ในตัว hash ด้วย เพื่อให้ขึ้น cost ในอนาคตได้โดยรหัสเก่ายัง verify ผ่าน */
const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** ใช้ scrypt จาก node:crypto ไม่ใช่ bcrypt/argon2 เพราะ
 *  - ไม่ต้องเพิ่ม dependency หรือ native binary (ลดความเสี่ยง supply chain)
 *  - scrypt เป็น memory-hard เหมือน argon2 คือทน GPU brute-force
 *  - bcrypt ตัด password ที่ยาวเกิน 72 byte เงียบๆ ซึ่งเป็นกับดักที่ไม่ต้องเจอ */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(plain.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
  });

  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let expected: Buffer;
  let salt: Buffer;
  try {
    expected = Buffer.from(hashB64, "base64");
    salt = Buffer.from(saltB64, "base64");
  } catch {
    return false;
  }
  if (expected.length === 0 || salt.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await scryptAsync(plain.normalize("NFKC"), salt, expected.length, {
      N: n,
      r,
      p,
    });
  } catch {
    // พารามิเตอร์ในค่าที่เก็บไว้เพี้ยน (เช่น N ไม่ใช่กำลังสอง) — ถือว่าไม่ผ่าน
    return false;
  }

  // เทียบแบบ constant-time เพื่อไม่ให้เวลาที่ใช้บอกใบ้ว่า hash ตรงกันกี่ byte
  return timingSafeEqual(actual, expected);
}

/** token ของ session — 32 byte สุ่มจาก CSPRNG (base64url ยาว 43 ตัว)
 *  ตัวนี้คือค่าที่อยู่ใน cookie ฝั่ง DB เก็บแค่ sha256 ของมัน */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** sha256 ธรรมดาพอสำหรับ session token (ไม่ต้อง scrypt) เพราะ token
 *  สุ่ม 256 bit อยู่แล้ว ไม่มีอะไรให้ brute-force — ต่างจากรหัสผ่านที่คนตั้งเอง */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
