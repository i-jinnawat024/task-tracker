# Task Tracker

ลิสต์งานที่แชร์กันได้ 2 คน — Next.js 15 + Prisma + Supabase Auth

**ฟีเจอร์:** เพิ่ม/แก้/ลบ/ติ๊กเสร็จ · กำหนดวันเสร็จ + ไฮไลต์งานเลยกำหนด · ความสำคัญ 3 ระดับ + แท็ก · แชร์ลิสต์ให้อีกคนแก้ร่วมกันได้

---

## ตั้งค่าครั้งแรก (ทำตามลำดับ ~10 นาที)

### 1. สร้าง Supabase project

1. เข้า https://supabase.com → **Sign in with GitHub** → **New project**
2. กรอก
   - **Name:** `task-tracker`
   - **Database Password:** กดปุ่ม Generate แล้ว **copy เก็บไว้** (หน้านี้ไม่โชว์ซ้ำ)
   - **Region:** `Southeast Asia (Singapore)` — ใกล้ไทยสุด latency ต่ำสุด
3. กด **Create new project** แล้วรอ ~2 นาที

### 2. เอาค่า env มาใส่

```bash
cp .env.example .env
```

เปิด `.env` แล้วเติม 4 ค่า:

> ใช้ `.env` ไฟล์เดียว **ไม่ใช่ `.env.local`** — Prisma CLI อ่านแค่ `.env` ถ้าไปใส่ใน
> `.env.local` คำสั่ง `pnpm db:migrate` จะหา `DATABASE_URL` ไม่เจอ (Next.js อ่านทั้งสองอยู่แล้ว)

| ตัวแปร | หาจากไหน |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → **API** → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → **API** → anon public key |
| `DATABASE_URL` | ปุ่ม **Connect** (บนสุด) → tab **ORMs** → เลือก **Prisma** → copy บรรทัด `DATABASE_URL` |
| `DIRECT_URL` | จากหน้าเดียวกัน copy บรรทัด `DIRECT_URL` |

ทั้ง 2 บรรทัดล่างจะมี `[YOUR-PASSWORD]` อยู่ — แทนด้วย database password จากข้อ 1

> ถ้ารหัสผ่านมีอักขระพิเศษต้อง URL-encode ก่อน (`@` → `%40`, `#` → `%23`, `/` → `%2F`)
> ลืมรหัส: Project Settings → Database → **Reset database password**

### 3. สร้างตารางใน DB

```bash
pnpm install
pnpm db:migrate      # ถามชื่อ migration ให้พิมพ์ init
pnpm db:lockdown
```

- `db:migrate` — Prisma สร้างตาราง `users` / `lists` / `list_members` / `tasks` ให้
- `db:lockdown` — **ห้ามข้าม** เปิด RLS ปิดทาง REST API ของ Supabase (เหตุผลอยู่ใน [prisma/lockdown.sql](prisma/lockdown.sql))
  ถ้ารันไม่ผ่าน ให้ copy เนื้อไฟล์ไปวางใน Dashboard → **SQL Editor** → Run แทนได้

### 4. ปิด email confirmation (ไม่บังคับ แต่สะดวกกว่า)

Supabase Dashboard → **Authentication** → **Sign In / Providers** → Email → ปิด **Confirm email** → Save

ถ้าไม่ปิด สมัครแล้วต้องไปกดลิงก์ในอีเมลก่อน login (ซึ่ง Supabase free tier ส่งได้ 2 ฉบับ/ชั่วโมง)

### 5. รัน

```bash
pnpm dev
```

เปิด http://localhost:3000 → สมัครสมาชิก → ใช้งานได้เลย

### 6. แชร์ให้อีกคน

1. ให้เขา **สมัครสมาชิกในแอปเองก่อน** ด้วยอีเมลของเขา
2. เจ้าของลิสต์กด **คนที่ใช้ลิสต์นี้** (ล่างสุด) → ใส่อีเมลของเขา → **แชร์**

แอปไม่ส่งอีเมลเชิญให้ — ต้องบอกเขาเองว่าให้ไปสมัคร (กันแอปถูกใช้ยิง spam)

---

## เอาขึ้นออนไลน์ (Vercel)

```bash
pnpm dlx vercel
```

ใส่ env 4 ตัวเดิมใน Vercel (`.env` ไม่ถูก commit ขึ้นไป ต้องกรอกเองในหน้าเว็บ) → Project → Settings → Environment Variables
แล้วเปลี่ยน Supabase Dashboard → Authentication → URL Configuration → **Site URL** เป็น URL ของ Vercel

> Vercel ใช้ serverless แต่ละ request แยก connection — `DATABASE_URL` **ต้องเป็น pooler port 6543 พร้อม `?pgbouncer=true&connection_limit=1`** ไม่ใช่ port 5432 ไม่งั้นชน connection limit เร็วมาก

---

## คำสั่งที่ใช้บ่อย

```bash
pnpm dev            # dev server
pnpm test           # unit test (38 เคส)
pnpm test:watch     # test แบบ watch
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm db:studio      # เปิด Prisma Studio ดู/แก้ข้อมูลใน DB
pnpm db:migrate     # สร้าง migration ใหม่หลังแก้ schema.prisma
pnpm db:lockdown    # เปิด RLS ให้ตารางใหม่ (รันทุกครั้งที่ migrate เพิ่มตาราง)
```

---

## สถาปัตยกรรม & เหตุผล

```
browser ──► Server Action ──► requireAccess() ──► Prisma ──► Postgres (Supabase)
   │                                                            
   └─────► Supabase Auth (cookie session) ◄─── middleware ต่ออายุ token
```

**Auth คนละชั้นกับ data** — Supabase Auth ถือ session (เพราะเขียน password auth เองมีความเสี่ยงมากกว่าประโยชน์) แต่ข้อมูล task ทั้งหมดอ่าน-เขียนผ่าน Prisma ไม่แตะ Supabase Data API เลย

**สิทธิ์อยู่ในโค้ด ไม่ใช่ RLS** — Prisma ต่อ Postgres ด้วย role `postgres` ที่ `BYPASSRLS` policy ใน DB จึงไม่ถูกบังคับใช้ สิทธิ์ทุกอย่างจึงมาจบที่ [`requireAccess()`](src/lib/db/access.ts) ซึ่งมี test คุมครบทุกทางแยก และทุกฟังก์ชันใน [`lists.ts`](src/lib/db/lists.ts) เรียก `assertAccess()` ก่อนแตะข้อมูล
แลกมาด้วยข้อดี: browser ไม่มีทางต่อ DB ตรง — ทางเข้าเดียวคือ Server Action ของเรา

**ทำไมต้อง `db:lockdown`** — Supabase เปิด REST API ให้ทุกตารางใน schema `public` อัตโนมัติ ใครมี anon key (ซึ่ง public อยู่ใน JS bundle) ก็ยิงอ่าน/เขียนได้ การเปิด RLS แบบไม่มี policy = ปิดประตูนั้นทิ้ง

**วันที่เก็บเป็น string `YYYY-MM-DD`** — คอลัมน์เป็น `date` ไม่ใช่ `timestamp` เพราะ "ครบกำหนดวันที่ 7" ไม่ควรเปลี่ยนตาม timezone ของเครื่องที่เปิดดู [`map.ts`](src/lib/db/map.ts) แปลงไป-กลับด้วย `getUTC*` เท่านั้น และ [`todayISO()`](src/lib/tasks.ts) อ่านวันจากเวลาท้องถิ่น ไม่ใช่ `toISOString()` (ซึ่งจะทำให้คนไทยกดตอน 00:30 เห็นวันเมื่อวาน)

**ไม่มี realtime** — Prisma ทำ realtime ไม่ได้ และการเปิด Supabase Realtime ต้องมี RLS policy ซึ่งจะกลายเป็นเขียน logic สิทธิ์ 2 ที่ [`Board.tsx`](src/components/Board.tsx) จึง `router.refresh()` ทุก 15 วิ (เฉพาะตอนแท็บ visible) ซึ่งพอสำหรับ 2 คน

---

## โครงไฟล์

```
prisma/
  schema.prisma        โมเดล User / List / ListMember / Task
  lockdown.sql         เปิด RLS ปิด REST API (รันผ่าน pnpm db:lockdown)
src/
  app/
    actions.ts         Server Actions ทั้งหมด (auth + task + sharing)
    board/page.tsx     ดึงข้อมูลฝั่ง server
    login/page.tsx
  components/          Board / TaskItem / NewTaskForm / ShareBox / AuthForm
  lib/
    tasks.ts           logic บริสุทธิ์: validate, sort, filter, overdue, summary
    types.ts
    auth.ts            อ่าน session + sync user ลง Prisma
    db/
      access.ts        requireAccess() — ด่านตรวจสิทธิ์
      lists.ts         query/mutation ทั้งหมด (เรียก assertAccess ก่อนทุกครั้ง)
      map.ts           Prisma row → Task (จัดการเรื่องวันที่)
      prisma.ts        client singleton
  middleware.ts        ต่ออายุ session + กันคนไม่ login เข้า /board
tests/                 38 เคส ครอบ logic + สิทธิ์ + การแปลงวันที่
```

---

## แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `ยังไม่ได้ตั้งค่า Supabase` | ยังไม่มีไฟล์ `.env` หรือค่ายังว่าง → ทำข้อ 2 |
| `Environment variable not found: DATABASE_URL` | ใส่ค่าไว้ใน `.env.local` — ต้องอยู่ใน `.env` |
| `Can't reach database server` | รหัสผ่านใน `DATABASE_URL` ผิด หรือมีอักขระพิเศษที่ยังไม่ URL-encode |
| `prepared statement "s0" already exists` | `DATABASE_URL` ลืมใส่ `?pgbouncer=true` |
| migrate ค้างไม่ขยับ | `DIRECT_URL` ชี้ port 6543 อยู่ — ต้องเป็น **5432** |
| สมัครแล้ว login ไม่ได้ | Confirm email ยังเปิด → ไปกดลิงก์ในอีเมล หรือปิดตามข้อ 4 |
| แชร์แล้วขึ้น `ยังไม่มีบัญชีอีเมลนี้` | อีกคนยังไม่ได้สมัคร หรือสมัครด้วยอีเมลอื่น |
| อีกคนเพิ่มงานแล้วไม่เห็น | รอ 15 วิ (auto refresh) หรือ refresh หน้าเอง |
