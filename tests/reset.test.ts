import { describe, expect, it } from "vitest";
import {
  MAX_RESET_REQUESTS,
  RESET_TTL_MS,
  resetTokenStatus,
  tooManyResetRequests,
  validateNewPassword,
} from "@/lib/auth/reset";

const NOW = new Date("2026-09-07T12:00:00.000Z");
const inFuture = new Date(NOW.getTime() + 30 * 60 * 1000);
const inPast = new Date(NOW.getTime() - 1);

describe("resetTokenStatus", () => {
  it("ไม่มี record (token ปลอมหรือถูกลบไปแล้ว) = missing", () => {
    expect(resetTokenStatus(null, NOW)).toBe("missing");
  });

  it("token ที่ยังไม่หมดอายุและไม่เคยใช้ = valid", () => {
    expect(resetTokenStatus({ expiresAt: inFuture, usedAt: null }, NOW)).toBe("valid");
  });

  it("token ที่เลยเวลาหมดอายุ = expired", () => {
    expect(resetTokenStatus({ expiresAt: inPast, usedAt: null }, NOW)).toBe("expired");
  });

  it("token ที่ใช้ไปแล้ว = used (ใช้ซ้ำไม่ได้ แม้ยังไม่หมดอายุ)", () => {
    expect(
      resetTokenStatus({ expiresAt: inFuture, usedAt: new Date(NOW.getTime() - 60) }, NOW),
    ).toBe("used");
  });

  it("ใช้แล้วและหมดอายุแล้ว รายงานว่า used เพราะบอกสาเหตุจริงได้ตรงกว่า", () => {
    expect(resetTokenStatus({ expiresAt: inPast, usedAt: inPast }, NOW)).toBe("used");
  });

  it("หมดอายุ ณ วินาทีเดียวกันเป๊ะ ถือว่าหมดอายุแล้ว (ไม่เผื่อให้)", () => {
    expect(resetTokenStatus({ expiresAt: NOW, usedAt: null }, NOW)).toBe("expired");
  });

  it("อายุ token ต้องสั้น — ไม่เกิน 1 ชั่วโมง", () => {
    expect(RESET_TTL_MS).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});

describe("validateNewPassword", () => {
  it("ผ่านเมื่อยาวพอและตรงกันทั้งสองช่อง", () => {
    const result = validateNewPassword({ password: "newpass123", confirm: "newpass123" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.password).toBe("newpass123");
  });

  it("ปฏิเสธเมื่อสองช่องไม่ตรงกัน", () => {
    const result = validateNewPassword({ password: "newpass123", confirm: "newpass124" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.confirm).toBeTruthy();
  });

  it("ปฏิเสธเมื่อสั้นเกินไป และไม่บ่นเรื่องไม่ตรงกันซ้ำซ้อน", () => {
    const result = validateNewPassword({ password: "short", confirm: "short" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.password).toContain("8");
      expect(result.errors.confirm).toBeUndefined();
    }
  });

  it("ปฏิเสธเมื่อยาวเกินลิมิต (กัน DoS จาก scrypt)", () => {
    const long = "x".repeat(1025);
    expect(validateNewPassword({ password: long, confirm: long }).ok).toBe(false);
  });

  it("ไม่ trim รหัสผ่าน — ช่องว่างหัวท้ายเป็นส่วนหนึ่งของรหัส", () => {
    const result = validateNewPassword({ password: "  spaces  ", confirm: "  spaces  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.password).toBe("  spaces  ");
  });

  it("ช่องว่างที่ต่างกันถือว่าไม่ตรงกัน", () => {
    expect(validateNewPassword({ password: "password1", confirm: "password1 " }).ok).toBe(
      false,
    );
  });
});

describe("tooManyResetRequests", () => {
  it("ยังไม่ถึงลิมิตให้ผ่าน", () => {
    expect(tooManyResetRequests(0)).toBe(false);
    expect(tooManyResetRequests(MAX_RESET_REQUESTS - 1)).toBe(false);
  });

  it("ถึงลิมิตแล้วต้องกั้น เพื่อไม่ให้แอปถูกใช้ยิงอีเมลรบกวนคนอื่น", () => {
    expect(tooManyResetRequests(MAX_RESET_REQUESTS)).toBe(true);
    expect(tooManyResetRequests(MAX_RESET_REQUESTS + 5)).toBe(true);
  });
});
