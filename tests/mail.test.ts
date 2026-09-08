import { describe, expect, it } from "vitest";
import { buildResetUrl, escapeHtml, renderResetEmail } from "@/lib/mail";

describe("buildResetUrl", () => {
  it("ประกอบลิงก์จาก base url + token", () => {
    expect(buildResetUrl("https://tasks.example.com", "abc123")).toBe(
      "https://tasks.example.com/reset?token=abc123",
    );
  });

  it("base url ที่มี / ต่อท้ายต้องไม่ได้ // ซ้อน", () => {
    expect(buildResetUrl("https://tasks.example.com/", "abc123")).toBe(
      "https://tasks.example.com/reset?token=abc123",
    );
  });

  it("encode token ที่มีอักขระพิเศษ เพื่อไม่ให้ query string เพี้ยน", () => {
    expect(buildResetUrl("http://localhost:3000", "a+b/c=d&e")).toBe(
      "http://localhost:3000/reset?token=a%2Bb%2Fc%3Dd%26e",
    );
  });

  it("รองรับ localhost แบบ http (ตอน dev)", () => {
    expect(buildResetUrl("http://localhost:3000", "t")).toMatch(
      /^http:\/\/localhost:3000\/reset\?token=t$/,
    );
  });
});

describe("escapeHtml", () => {
  it("แปลงอักขระที่ทำให้ HTML แตกให้ปลอดภัย", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("ข้อความไทยธรรมดาไม่ถูกแตะ", () => {
    expect(escapeHtml("มะปราง")).toBe("มะปราง");
  });
});

describe("renderResetEmail", () => {
  const url = "https://tasks.example.com/reset?token=xyz";

  it("มีลิงก์อยู่ทั้งใน text และ html", () => {
    const mail = renderResetEmail({ url, displayName: "มะปราง" });
    expect(mail.subject).toBeTruthy();
    expect(mail.text).toContain(url);
    expect(mail.html).toContain(url);
  });

  it("บอกอายุลิงก์ให้ผู้รับรู้ว่ามีเวลาจำกัด", () => {
    const mail = renderResetEmail({ url, displayName: null });
    expect(mail.text).toContain("60 นาที");
  });

  it("ทักด้วยชื่อถ้ามี และไม่พังถ้าไม่มีชื่อ", () => {
    expect(renderResetEmail({ url, displayName: "มะปราง" }).text).toContain("มะปราง");
    expect(renderResetEmail({ url, displayName: null }).html).toBeTruthy();
  });

  it("escape ชื่อผู้ใช้ใน html — ชื่อเป็นข้อความที่ผู้ใช้พิมพ์เอง จึงเชื่อไม่ได้", () => {
    const mail = renderResetEmail({ url, displayName: '<img src=x onerror=alert(1)>' });
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
  });

  it("เตือนผู้รับว่าถ้าไม่ได้กดขอเอง ให้เมินอีเมลนี้", () => {
    const mail = renderResetEmail({ url, displayName: null });
    expect(mail.text.toLowerCase()).toContain("ไม่ได้");
  });
});
