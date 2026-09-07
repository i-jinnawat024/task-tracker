import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE } from "./cookie";
import { hashToken, newSessionToken } from "./password";

export { SESSION_COOKIE };

const TTL_DAYS = 30;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
/** ต่ออายุให้เมื่อเหลือน้อยกว่านี้ — sliding session แบบไม่ต้องเขียน DB ทุก request */
const RENEW_WHEN_LEFT_MS = 7 * 24 * 60 * 60 * 1000;

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export async function createSession(userId: string): Promise<void> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, // JS ในหน้าเว็บอ่านไม่ได้ = XSS ขโมย session ไม่ได้
    sameSite: "lax", // กัน CSRF ระดับพื้นฐาน แต่ยังกดลิงก์จากภายนอกเข้ามาแล้วยัง login อยู่
    secure: process.env.NODE_ENV === "production", // localhost เป็น http จึงเปิดเฉพาะ prod
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, displayName: true } },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    // หมดอายุแล้ว — เก็บขยะทิ้งเลยไม่ต้องรอ cron
    await prisma.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
    return null;
  }

  if (session.expiresAt.getTime() - Date.now() < RENEW_WHEN_LEFT_MS) {
    await renewSession(token).catch(() => undefined);
  }

  return session.user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    // ลบแถวใน DB ด้วย ไม่ใช่ลบแค่ cookie — ไม่งั้น token ที่หลุดไปแล้วยังใช้ได้อยู่
    await prisma.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }

  cookieStore.delete(SESSION_COOKIE);
}

async function renewSession(token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.session.update({
    where: { tokenHash: hashToken(token) },
    data: { expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}
