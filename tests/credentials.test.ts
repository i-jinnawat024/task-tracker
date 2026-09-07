import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validateSignIn,
  validateSignUp,
} from "@/lib/auth/credentials";

describe("normalizeEmail", () => {
  it("trim + lowercase เพื่อให้ unique constraint ใน DB ทำงานจริง", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).toBe("foo@example.com");
  });

  it("ค่าว่างคืนค่าว่าง ไม่ throw", () => {
    expect(normalizeEmail("")).toBe("");
    expect(normalizeEmail("   ")).toBe("");
  });
});

describe("validateSignUp", () => {
  it("รับค่าที่ถูกต้อง และ normalize อีเมล + ตั้งชื่อ default จากอีเมล", () => {
    const result = validateSignUp({
      email: " Mint@Example.com ",
      password: "longenough1",
      displayName: "  ",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.email).toBe("mint@example.com");
    expect(result.value.displayName).toBe("mint");
  });

  it("เก็บชื่อที่กรอกมาแบบ trim แล้ว", () => {
    const result = validateSignUp({
      email: "a@b.com",
      password: "longenough1",
      displayName: "  มะปราง  ",
    });
    if (result.ok) expect(result.value.displayName).toBe("มะปราง");
  });

  it("ปฏิเสธอีเมลที่ผิดรูปแบบ", () => {
    for (const email of ["", "notanemail", "a@", "@b.com", "a b@c.com", "a@b"]) {
      const result = validateSignUp({ email, password: "longenough1" });
      expect(result.ok, `email=${email} ควรไม่ผ่าน`).toBe(false);
      if (!result.ok) expect(result.errors.email).toBeTruthy();
    }
  });

  it(`ปฏิเสธรหัสผ่านที่สั้นกว่า ${MIN_PASSWORD_LENGTH} ตัว`, () => {
    const result = validateSignUp({ email: "a@b.com", password: "1234567" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.password).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("ไม่ trim รหัสผ่าน — ช่องว่างหัวท้ายเป็นส่วนหนึ่งของรหัส", () => {
    const result = validateSignUp({ email: "a@b.com", password: "  spaces  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.password).toBe("  spaces  ");
  });

  it("ปฏิเสธรหัสผ่านที่ยาวเกินไป (กัน DoS จาก scrypt ที่ input ใหญ่)", () => {
    const result = validateSignUp({ email: "a@b.com", password: "x".repeat(1025) });
    expect(result.ok).toBe(false);
  });

  it("ปฏิเสธชื่อที่ยาวเกิน 50 ตัว", () => {
    const result = validateSignUp({
      email: "a@b.com",
      password: "longenough1",
      displayName: "ก".repeat(51),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.displayName).toBeTruthy();
  });

  it("รายงาน error หลายช่องพร้อมกัน ไม่ใช่ทีละช่อง", () => {
    const result = validateSignUp({ email: "bad", password: "1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.email).toBeTruthy();
      expect(result.errors.password).toBeTruthy();
    }
  });
});

describe("validateSignIn", () => {
  it("ผ่านเมื่อกรอกครบ และ normalize อีเมลให้เหมือนตอนสมัคร", () => {
    const result = validateSignIn({ email: " A@B.com ", password: "x" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email).toBe("a@b.com");
  });

  it("ไม่บังคับความยาวรหัสตอน login — คนที่สมัครไว้ก่อนกฎเปลี่ยนต้องยัง login ได้", () => {
    const result = validateSignIn({ email: "a@b.com", password: "1" });
    expect(result.ok).toBe(true);
  });

  it("ปฏิเสธเมื่อกรอกไม่ครบ", () => {
    expect(validateSignIn({ email: "", password: "x" }).ok).toBe(false);
    expect(validateSignIn({ email: "a@b.com", password: "" }).ok).toBe(false);
  });
});
