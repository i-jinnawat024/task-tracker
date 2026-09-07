import { describe, expect, it } from "vitest";
import { ForbiddenError, requireAccess } from "@/lib/db/access";

// เดิมงานนี้เป็นหน้าที่ของ RLS ใน Postgres แต่ Prisma ต่อ DB ด้วย role ที่ BYPASSRLS
// สิทธิ์จึงย้ายมาอยู่ที่ชั้นนี้ — ต้องมี test คุมให้แน่นกว่าเดิม
describe("requireAccess", () => {
  it("คนที่ไม่ได้เป็นสมาชิกลิสต์ ทำอะไรไม่ได้เลย", () => {
    for (const need of ["read", "write", "own"] as const) {
      expect(() => requireAccess(null, need)).toThrow(ForbiddenError);
    }
    expect(() => requireAccess(null, "read")).toThrow("ไม่มีสิทธิ์เข้าถึงลิสต์นี้");
  });

  it("editor อ่านและแก้งานได้", () => {
    expect(requireAccess({ role: "editor" }, "read")).toEqual({ role: "editor" });
    expect(requireAccess({ role: "editor" }, "write")).toEqual({ role: "editor" });
  });

  it("editor แตะเรื่องระดับลิสต์ไม่ได้ (เชิญคน / เปลี่ยนชื่อ / ลบลิสต์)", () => {
    expect(() => requireAccess({ role: "editor" }, "own")).toThrow(ForbiddenError);
    expect(() => requireAccess({ role: "editor" }, "own")).toThrow(
      "เฉพาะเจ้าของลิสต์เท่านั้น",
    );
  });

  it("owner ทำได้ทุกระดับ", () => {
    for (const need of ["read", "write", "own"] as const) {
      expect(requireAccess({ role: "owner" }, need)).toEqual({ role: "owner" });
    }
  });

  it("ForbiddenError ต้องแยกจาก Error ทั่วไปได้ เพื่อ map เป็น 403 ไม่ใช่ 500", () => {
    const err = new ForbiddenError("nope");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ForbiddenError");
  });
});
