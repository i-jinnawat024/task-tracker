import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** Supabase client ฝั่ง server — ใช้เฉพาะเรื่อง auth (login/logout/อ่าน session)
 *  ข้อมูล task ทั้งหมดอ่าน-เขียนผ่าน Prisma ไม่แตะ Supabase Data API เลย */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // เรียกจาก Server Component ที่เขียน cookie ไม่ได้ — ไม่เป็นไร
          // middleware เป็นตัวต่ออายุ session ให้อยู่แล้ว
        }
      },
    },
  });
}
