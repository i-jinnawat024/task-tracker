import { describe, expect, it } from "vitest";
import { hashPassword, hashToken, newSessionToken, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("รหัสที่ถูกต้องต้องผ่าน", async () => {
    const stored = await hashPassword("mySecret123");
    expect(await verifyPassword("mySecret123", stored)).toBe(true);
  });

  it("รหัสผิดต้องไม่ผ่าน", async () => {
    const stored = await hashPassword("mySecret123");
    expect(await verifyPassword("mySecret124", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
    expect(await verifyPassword("mySecret123 ", stored)).toBe(false);
  });

  it("รหัสเดียวกันต้องได้ hash ไม่ซ้ำกัน (salt สุ่มใหม่ทุกครั้ง)", async () => {
    const a = await hashPassword("samePassword");
    const b = await hashPassword("samePassword");
    expect(a).not.toBe(b);
    // แต่ทั้งคู่ต้อง verify ผ่าน — พิสูจน์ว่า salt ถูกเก็บไปกับ hash
    expect(await verifyPassword("samePassword", a)).toBe(true);
    expect(await verifyPassword("samePassword", b)).toBe(true);
  });

  it("เก็บในรูปแบบ scrypt$N$r$p$salt$hash และไม่มีรหัสจริงปนอยู่", async () => {
    const stored = await hashPassword("plaintextLeakCheck");
    const parts = stored.split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    expect(Number(parts[1])).toBeGreaterThanOrEqual(16384);
    expect(stored).not.toContain("plaintextLeakCheck");
  });

  it("รองรับรหัสภาษาไทยและอีโมจิ (unicode)", async () => {
    const stored = await hashPassword("รหัสผ่านไทย🔐");
    expect(await verifyPassword("รหัสผ่านไทย🔐", stored)).toBe(true);
    expect(await verifyPassword("รหัสผ่านไทย", stored)).toBe(false);
  });

  it("ค่าที่เก็บมาผิดรูปแบบต้องคืน false ไม่ใช่ throw", async () => {
    for (const junk of ["", "notahash", "scrypt$1$2$3", "bcrypt$a$b$c$d$e"]) {
      expect(await verifyPassword("anything", junk)).toBe(false);
    }
  });
});

describe("newSessionToken / hashToken", () => {
  it("token ต้องสุ่มไม่ซ้ำและยาวพอจะเดาไม่ได้", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => newSessionToken()));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("hashToken ต้องคงที่สำหรับ input เดิม และต่างกันเมื่อ input ต่าง", () => {
    const token = newSessionToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(hashToken(newSessionToken()));
  });

  it("hashToken ต้องไม่มี token ต้นฉบับอยู่ในผลลัพธ์ (เก็บลง DB ได้)", () => {
    const token = newSessionToken();
    const hashed = hashToken(token);
    expect(hashed).not.toContain(token);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });
});
