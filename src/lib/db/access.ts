export type MemberRole = "owner" | "editor";

/** ผลการหาสมาชิกภาพในลิสต์ — null คือไม่ได้เป็นสมาชิก */
export type Access = { role: MemberRole } | null;

/** read  = ดูงานในลิสต์
 *  write = เพิ่ม/แก้/ลบงาน (สมาชิกทั้งสองคนทำได้ — คือจุดประสงค์ของการแชร์)
 *  own   = เรื่องระดับลิสต์: เชิญคน, เตะออก, เปลี่ยนชื่อ, ลบลิสต์ */
export type AccessNeed = "read" | "write" | "own";

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** ด่านตรวจสิทธิ์ตัวจริงของแอปนี้
 *
 *  Prisma ต่อ Postgres ด้วย role `postgres` ซึ่ง BYPASSRLS — policy ใน DB
 *  ไม่ได้ถูกบังคับใช้เลย สิทธิ์ทั้งหมดจึงมาจบที่ฟังก์ชันนี้
 *  แยกออกมาเป็น pure function เพื่อให้ test ครอบได้ครบทุกทางแยกโดยไม่ต้องมี DB */
export function requireAccess(access: Access, need: AccessNeed): { role: MemberRole } {
  if (!access) throw new ForbiddenError("ไม่มีสิทธิ์เข้าถึงลิสต์นี้");
  if (need === "own" && access.role !== "owner")
    throw new ForbiddenError("เฉพาะเจ้าของลิสต์เท่านั้นที่ทำรายการนี้ได้");
  return { role: access.role };
}
