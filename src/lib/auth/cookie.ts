/** แยกไฟล์นี้ออกมาเพราะ middleware รันบน Edge runtime ที่ import node:crypto ไม่ได้
 *  ถ้าไป import จาก session.ts (ซึ่งลากเอา scrypt เข้ามา) build จะพัง */
export const SESSION_COOKIE = "tt_session";
