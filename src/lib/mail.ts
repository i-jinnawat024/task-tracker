import { RESET_TTL_MS } from "./auth/reset";

const TTL_MINUTES = Math.round(RESET_TTL_MS / 60_000);

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildResetUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  // encode เพราะ token เป็น base64url ซึ่งอาจมี - _ และเผื่อรูปแบบเปลี่ยนในอนาคต
  return `${base}/reset?token=${encodeURIComponent(token)}`;
}

/** URL ของแอปสำหรับใส่ในอีเมล
 *  ต้องมาจาก env ไม่ใช่จาก header ของ request — ไม่งั้นคนยิง Host header ปลอม
 *  ทำให้ลิงก์ reset ในอีเมลชี้ไปเซิร์ฟเวอร์ของเขาแล้วดูด token ได้ */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export type MailContent = { subject: string; text: string; html: string };

export function renderResetEmail(opts: {
  url: string;
  displayName: string | null;
}): MailContent {
  const greeting = opts.displayName ? `สวัสดี ${opts.displayName}` : "สวัสดี";

  const text = [
    `${greeting},`,
    "",
    "มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชี Task Tracker ของคุณ",
    "กดลิงก์ด้านล่างเพื่อตั้งรหัสใหม่:",
    "",
    opts.url,
    "",
    `ลิงก์นี้ใช้ได้ ${TTL_MINUTES} นาที และใช้ได้ครั้งเดียว`,
    "ถ้าคุณไม่ได้กดขอเอง ไม่ต้องทำอะไร — เมินอีเมลนี้ได้เลย รหัสผ่านเดิมยังใช้ได้ปกติ",
  ].join("\n");

  const html = `<!doctype html>
<html lang="th"><body style="margin:0;padding:24px;background:#f1f5f9;font-family:'Noto Sans Thai',system-ui,sans-serif;color:#1e293b">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
    <h1 style="margin:0 0 16px;font-size:18px">ตั้งรหัสผ่านใหม่</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6">${escapeHtml(greeting)},</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6">
      มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชี Task Tracker ของคุณ
    </p>
    <a href="${escapeHtml(opts.url)}"
       style="display:inline-block;background:#4338ca;color:#fff;text-decoration:none;
              padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600">
      ตั้งรหัสผ่านใหม่
    </a>
    <p style="margin:20px 0 0;font-size:12px;color:#64748b;line-height:1.6">
      ลิงก์นี้ใช้ได้ ${TTL_MINUTES} นาที และใช้ได้ครั้งเดียว<br>
      ถ้าคุณไม่ได้กดขอเอง ไม่ต้องทำอะไร — เมินอีเมลนี้ได้เลย รหัสผ่านเดิมยังใช้ได้ปกติ
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;word-break:break-all">
      ถ้าปุ่มกดไม่ได้ copy ลิงก์นี้ไปเปิดในเบราว์เซอร์: ${escapeHtml(opts.url)}
    </p>
  </div>
</body></html>`;

  return { subject: "ตั้งรหัสผ่านใหม่ — Task Tracker", text, html };
}

export type SendResult = { delivered: boolean; fallbackUrl?: string };

/** ส่งอีเมลผ่าน Resend REST API ตรงๆ ไม่ใช้ SDK — เป็น request เดียว
 *  ไม่คุ้มที่จะเพิ่ม dependency (และคง policy เดิมของโปรเจกต์ว่าพึ่ง dep ให้น้อย)
 *
 *  ถ้ายังไม่ตั้ง RESEND_API_KEY จะ log ลิงก์ลง console ของ server แทน
 *  เพื่อให้ flow ใช้งาน/ทดสอบได้ทันทีโดยไม่ต้องมี key */
export async function sendMail(opts: {
  to: string;
  content: MailContent;
  devFallbackUrl?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Task Tracker <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(
      [
        "",
        "─".repeat(72),
        "[mail] ยังไม่ได้ตั้ง RESEND_API_KEY — ไม่ได้ส่งอีเมลจริง",
        `[mail] ถึง: ${opts.to}`,
        `[mail] เรื่อง: ${opts.content.subject}`,
        opts.devFallbackUrl ? `[mail] ลิงก์: ${opts.devFallbackUrl}` : "",
        "─".repeat(72),
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return { delivered: false, fallbackUrl: opts.devFallbackUrl };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.content.subject,
      text: opts.content.text,
      html: opts.content.html,
    }),
  });

  if (!response.ok) {
    // log รายละเอียดไว้ฝั่ง server แต่ไม่ส่งกลับไปให้ผู้ใช้เห็น
    console.error("[mail] Resend ตอบ", response.status, await response.text());
    throw new Error("ส่งอีเมลไม่สำเร็จ");
  }

  return { delivered: true };
}
