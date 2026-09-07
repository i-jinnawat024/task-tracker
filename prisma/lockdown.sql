-- รันหลัง `pnpm db:migrate` ทุกครั้งที่มีตารางใหม่:  pnpm db:lockdown
--
-- ทำไมต้องมีไฟล์นี้:
-- Supabase เปิด REST API (PostgREST) ให้ทุกตารางใน schema `public` อัตโนมัติ
-- ใครมี anon key (ซึ่งเป็นค่า public อยู่ใน JS bundle) ก็ยิง API อ่าน/เขียนได้
-- การเปิด RLS แบบ "ไม่มี policy เลย" = ปิดประตูฝั่ง REST ทั้งหมด
-- แต่ Prisma ต่อด้วย role `postgres` ซึ่ง BYPASSRLS จึงทำงานได้ตามปกติ
--
-- แปลว่า: ทางเข้าข้อมูลมีทางเดียว = Server Action ของแอปเรา ที่เช็คสิทธิ์เองใน
-- src/lib/db/guards.ts

alter table public.users        enable row level security;
alter table public.lists        enable row level security;
alter table public.list_members enable row level security;
alter table public.tasks        enable row level security;

-- กันเหนียว: ถอนสิทธิ์ตรงๆ ของ role ที่ PostgREST ใช้ออกไปด้วย
revoke all on public.users        from anon, authenticated;
revoke all on public.lists        from anon, authenticated;
revoke all on public.list_members from anon, authenticated;
revoke all on public.tasks        from anon, authenticated;
