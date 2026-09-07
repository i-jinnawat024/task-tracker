import { redirect } from "next/navigation";
import { prisma } from "./db/prisma";
import { createSupabaseServerClient } from "./supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string | null;
};

/** อ่าน user จาก session แล้ว sync ลงตาราง users ของ Prisma
 *
 *  ทำที่นี่แทน DB trigger บน auth.users เพราะ trigger เป็น SQL นอกสายตา Prisma
 *  migrate — พอ schema เปลี่ยนแล้วลืมแก้ trigger จะพังแบบเงียบๆ
 *  ต้นทุนคือ upsert 1 ครั้งต่อ request ซึ่งถูกกว่าปัญหาที่เลี่ยงได้เยอะ
 *
 *  ใช้ getUser() ไม่ใช่ getSession() — getUser ตรวจ JWT กับ Supabase จริง
 *  ส่วน getSession อ่านจาก cookie ที่ปลอมได้ */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ?? user.email.split("@")[0];

  const row = await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email },
    create: { id: user.id, email: user.email, displayName },
    select: { id: true, email: true, displayName: true },
  });

  return row;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
