/** อ่าน env แบบ fail-fast — ถ้าลืมตั้งค่าจะได้ error ที่บอกวิธีแก้
 *  ดีกว่าปล่อยให้ supabase-js พังด้วย "Invalid URL" ที่อ่านไม่รู้เรื่อง */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า Supabase — copy .env.example เป็น .env " +
        "แล้วใส่ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY (ดู README ข้อ 1)",
    );
  }

  return { url, anonKey };
}
