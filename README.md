# Task Tracker

ลิสต์งานที่แชร์กันได้ 2 คน — Next.js 15 (App Router) + Prisma + Postgres

**ฟีเจอร์:** เพิ่ม/แก้/ลบ/ติ๊กเสร็จ · กำหนดวันเสร็จ + ไฮไลต์งานเลยกำหนด · ความสำคัญ 3 ระดับ + แท็ก · แชร์ลิสต์ให้อีกคนแก้ร่วมกันได้ · login ด้วยอีเมล+รหัสผ่าน · ลืมรหัสผ่าน (ส่งลิงก์ทางอีเมล)

ไม่มี dependency ภายนอกนอกจาก DB — auth เขียนเองทั้งหมด (scrypt จาก `node:crypto` + session ใน DB)

---

## รันเลย (setup แล้ว)

DB migrate เรียบร้อยแล้ว ค่า connection อยู่ใน `.env` (ไม่ถูก commit)

```bash
pnpm dev
```

เปิด http://localhost:3000 → **สมัครสมาชิก** → ใช้งานได้เลย

### แชร์ให้อีกคน

1. ให้เขา **สมัครสมาชิกในแอปเองก่อน** ด้วยอีเมลของเขา
2. เจ้าของลิสต์กด **คนที่ใช้ลิสต์นี้** (ล่างสุด) → ใส่อีเมลของเขา → **แชร์**

แอปไม่ส่งอีเมลเชิญ — ต้องบอกเขาเองว่าให้ไปสมัคร (ไม่อยากให้แอปกลายเป็นเครื่องมือยิง spam)

### เปิดอีเมลจริงสำหรับ "ลืมรหัสผ่าน"

flow ลืมรหัสผ่าน**ทำงานได้แล้วโดยไม่ต้องตั้งอะไรเพิ่ม** แต่ตอนยังไม่มี `RESEND_API_KEY`
ลิงก์จะไป **log ที่ console ของ server** แทนการส่งอีเมลจริง (ใช้ตอน dev ได้สบาย
แต่แฟนคุณกดเองไม่ได้ ต้องมาเปิด terminal)

เปิดอีเมลจริง:

1. สมัคร https://resend.com (ฟรี 3,000 ฉบับ/เดือน) → **API Keys** → Create
2. ใส่ใน `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   MAIL_FROM="Task Tracker <onboarding@resend.dev>"
   APP_URL=http://localhost:3000
   ```
3. restart `pnpm dev`

> `onboarding@resend.dev` ใช้ได้เลยแต่**ส่งได้เฉพาะอีเมลที่คุณใช้สมัคร Resend เท่านั้น**
> ถ้าจะส่งหาแฟนต้อง verify โดเมนของตัวเองใน Resend ก่อน แล้วเปลี่ยน `MAIL_FROM`
>
> `APP_URL` ต้องตรงกับ URL จริงที่เปิดใช้ ไม่งั้นลิงก์ในอีเมลจะกดไม่ได้
> (จงใจอ่านจาก env ไม่ใช่จาก Host header — ไม่งั้นคนปลอม Host ทำให้ลิงก์ชี้ไปเซิร์ฟเวอร์เขาแล้วดูด token ได้)

---

## ตั้งค่าใหม่จากศูนย์ (เครื่องอื่น / DB ใหม่)

```bash
cp .env.example .env      # แล้วใส่ DATABASE_URL ของ Postgres ที่จะใช้
pnpm install
pnpm db:migrate           # ถามชื่อ migration ให้พิมพ์ init
pnpm dev
```

> ใช้ `.env` **ไม่ใช่ `.env.local`** — Prisma CLI อ่านแค่ `.env` ถ้าไปใส่ใน `.env.local`
> คำสั่ง `pnpm db:migrate` จะหา `DATABASE_URL` ไม่เจอ (Next.js อ่านทั้งสองอยู่แล้ว)

DB ที่ใช้ตอนนี้คือ **Prisma Postgres** ซึ่งมี endpoint เดียว ถ้าย้ายไป Supabase/Neon
ที่แยก pooler กับ direct connection ต้องเพิ่มใน `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooler port 6543 + ?pgbouncer=true
  directUrl = env("DIRECT_URL")     // direct port 5432 — migrate ต้องใช้ตัวนี้
}
```

**และถ้าย้ายไป Supabase ต้องเปิด RLS ให้ทุกตารางด้วย** เพราะ Supabase เปิด REST API
ให้ทุกตารางใน schema `public` อัตโนมัติ — ใครมี anon key ก็ยิงอ่าน/เขียนได้
(`alter table ... enable row level security;` แบบไม่มี policy ก็พอ เพราะ Prisma
ต่อด้วย role ที่ BYPASSRLS อยู่แล้ว)

---

## เอาขึ้นออนไลน์ (Vercel)

```bash
pnpm dlx vercel
```

ใส่ `DATABASE_URL` ใน Vercel → Project → Settings → Environment Variables (`.env` ไม่ถูก commit ขึ้นไป)

> serverless แต่ละ request แยก connection — ถ้า DB มี pooler ต้องชี้ `DATABASE_URL`
> ไปที่ pooler พร้อม `connection_limit=1` ไม่ใช่ direct connection ไม่งั้นชน connection limit เร็วมาก

---

## คำสั่งที่ใช้บ่อย

```bash
pnpm dev            # dev server
pnpm test           # unit test (86 เคส)
pnpm test:watch     # test แบบ watch
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm db:studio      # เปิด Prisma Studio ดู/แก้ข้อมูลใน DB
pnpm db:migrate     # สร้าง migration ใหม่หลังแก้ schema.prisma
pnpm db:deploy      # apply migration บน production (ไม่สร้างใหม่)
```

---

## สถาปัตยกรรม & เหตุผล

```
browser ──► Server Action ──► requireUser() ──► requireAccess() ──► Prisma ──► Postgres
                                   │                  │
                          session cookie        เจ้าของ/สมาชิก?
```

browser ไม่มีทางต่อ DB ตรง — ทางเข้าเดียวคือ Server Action ของเรา ทุกตัวเช็ค 2 ชั้น:
ใครเป็นคนขอ (`requireUser`) แล้วคนนั้นมีสิทธิ์กับลิสต์นี้ไหม (`requireAccess`)

**สิทธิ์อยู่ในโค้ด ไม่ใช่ RLS** — Prisma ต่อ Postgres ด้วย role ที่ BYPASSRLS
policy ใน DB จึงไม่ถูกบังคับใช้ สิทธิ์ทั้งหมดมาจบที่ [`requireAccess()`](src/lib/db/access.ts)
ซึ่งเป็น pure function มี test คุมครบทุกทางแยก และทุกฟังก์ชันใน
[`lists.ts`](src/lib/db/lists.ts) เรียก `assertAccess()` ก่อนแตะข้อมูลทุกครั้ง

**รหัสผ่าน hash ด้วย scrypt จาก `node:crypto`** ไม่ใช่ bcrypt/argon2 เพราะ
ไม่ต้องเพิ่ม dependency หรือ native binary (ลดความเสี่ยง supply chain), scrypt เป็น
memory-hard ทน GPU brute-force เหมือน argon2, และ bcrypt ตัด password ที่ยาวเกิน
72 byte เงียบๆ ซึ่งเป็นกับดักที่ไม่ต้องเจอ — เก็บ salt กับ cost ไว้ในตัว hash
(`scrypt$N$r$p$salt$hash`) เพื่อขึ้น cost ในอนาคตได้โดยรหัสเก่ายัง verify ผ่าน

**session เป็น opaque token ใน DB ไม่ใช่ JWT** — เพิกถอนได้ทันที (กด "ออกจากระบบ"
แล้วจบจริง ไม่ใช่รอ token หมดอายุ) DB เก็บแค่ sha256 ของ token ที่อยู่ใน cookie
ถ้า DB รั่วก็ปลอม session ไม่ได้ · cookie เป็น httpOnly (XSS ขโมยไม่ได้) + sameSite lax

**login ไม่บอกใบ้ว่าอีเมลไหนมีบัญชี** — ทั้งกรณีไม่มี user และรหัสผิด ตอบข้อความเดียวกัน
และกรณีไม่เจอ user ยังเสียเวลา verify กับ hash หลอกๆ เพื่อไม่ให้เวลาตอบสนองบอกใบ้ได้
(ดู `DUMMY_HASH` ใน [`auth/index.ts`](src/lib/auth/index.ts))

**middleware ตรวจแค่ว่ามี cookie ไหม** — ไม่ได้ตรวจว่า session ใช้ได้จริง เพราะ middleware
รันบน Edge runtime ที่ต่อ Prisma ไม่ได้ ถือเป็นแค่ด่านหน้าราคาถูก การตัดสินสิทธิ์จริง
อยู่ฝั่ง server component/action เสมอ · และไม่ทำ redirect `/login → /board` ที่นั้น
เพราะถ้า cookie ค้างแต่ session ตายแล้วจะเด้งไป-กลับไม่จบ

**วันที่เก็บเป็น string `YYYY-MM-DD`** — คอลัมน์เป็น `date` ไม่ใช่ `timestamp` เพราะ
"ครบกำหนดวันที่ 7" ไม่ควรเปลี่ยนตาม timezone ของเครื่องที่เปิดดู
[`map.ts`](src/lib/db/map.ts) แปลงไป-กลับด้วย `getUTC*` เท่านั้น และ
[`todayISO()`](src/lib/tasks.ts) อ่านวันจากเวลาท้องถิ่น ไม่ใช่ `toISOString()`
(ซึ่งจะทำให้คนไทยกดตอน 00:30 เห็นวันเมื่อวาน)

**reset password** — ขอลิงก์ที่ `/forgot` → ลิงก์อายุ 60 นาที ใช้ได้ครั้งเดียว
เก็บใน DB เป็น sha256 เหมือน session · ตั้งรหัสใหม่สำเร็จแล้ว **ลบ session ทุกอุปกรณ์ของคนนั้นทิ้ง**
(ถ้ารหัสเดิมหลุด คนที่ยัง login ค้างต้องหมดสิทธิ์ด้วย) แล้วล็อกอินให้ใหม่ทันที
หน้า `/forgot` ตอบข้อความเดียวกันเสมอไม่ว่าอีเมลนั้นจะมีบัญชีหรือไม่ และจำกัด 3 ครั้ง/ชั่วโมง/บัญชี
โดยตอนโดนจำกัดก็ยังตอบข้อความเดิม — ถ้าตอบต่างกัน หน้านี้จะกลายเป็นเครื่องมือไล่เช็คว่าอีเมลไหนสมัครไว้

**ไม่มี realtime** — Prisma ทำ realtime ไม่ได้ [`Board.tsx`](src/components/Board.tsx)
จึง `router.refresh()` ทุก 15 วิ (เฉพาะตอนแท็บ visible) ซึ่งพอสำหรับใช้กัน 2 คน

---

## โครงไฟล์

```
prisma/
  schema.prisma        โมเดล User / Session / PasswordReset / List / ListMember / Task
  migrations/
src/
  app/
    actions.ts         Server Actions ทั้งหมด (auth + task + sharing)
    board/page.tsx     ดึงข้อมูลฝั่ง server
    login/page.tsx
    forgot/page.tsx    ขอลิงก์ตั้งรหัสใหม่
    reset/page.tsx     ตั้งรหัสใหม่จากลิงก์
  components/          Board / TaskItem / NewTaskForm / ShareBox / AuthForm
                       ForgotForm / ResetForm
  lib/
    tasks.ts           logic บริสุทธิ์: validate, sort, filter, overdue, summary
    types.ts
    auth/
      index.ts         registerUser / loginUser
      credentials.ts   validate + normalize อีเมล-รหัสผ่าน
      password.ts      scrypt hash/verify + session token
      session.ts       สร้าง/อ่าน/ลบ session (แตะ cookie + DB)
      reset.ts         logic บริสุทธิ์ของ reset: สถานะ token, rate limit, validate
      reset-service.ts ออกลิงก์ / ตรวจลิงก์ / เปลี่ยนรหัส (แตะ DB + ส่งอีเมล)
      cookie.ts        ชื่อ cookie เฉยๆ — แยกไว้ให้ Edge import ได้
    db/
      access.ts        requireAccess() — ด่านตรวจสิทธิ์
      lists.ts         query/mutation ทั้งหมด (เรียก assertAccess ก่อนทุกครั้ง)
      map.ts           Prisma row → Task (จัดการเรื่องวันที่)
      prisma.ts        client singleton
    mail.ts          ประกอบอีเมล + ส่งผ่าน Resend REST API
  middleware.ts        ด่านหน้า: ไม่มี cookie ก็ไม่ให้เข้า /board
tests/                 86 เคส — logic, สิทธิ์, วันที่, hash รหัสผ่าน, validate, reset token, อีเมล
```

---

## แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `Environment variable not found: DATABASE_URL` | ใส่ค่าไว้ใน `.env.local` — ต้องอยู่ใน `.env` |
| `Can't reach database server` | `DATABASE_URL` ผิด หรือรหัสผ่านมีอักขระพิเศษที่ยังไม่ URL-encode (`@` → `%40`) |
| `prepared statement "s0" already exists` | ต่อผ่าน pgbouncer แต่ลืมใส่ `?pgbouncer=true` |
| migrate ค้างไม่ขยับ | ชี้ไปที่ transaction pooler — migrate ต้องใช้ direct connection (`directUrl`) |
| สมัครแล้วขึ้น `อีเมลนี้สมัครไว้แล้ว` | มีบัญชีอยู่แล้ว → ไปแท็บเข้าสู่ระบบ (อีเมลไม่สนตัวพิมพ์ใหญ่เล็ก) |
| แชร์แล้วขึ้น `ยังไม่มีบัญชีอีเมลนี้` | อีกคนยังไม่ได้สมัคร หรือสมัครด้วยอีเมลอื่น |
| อีกคนเพิ่มงานแล้วไม่เห็น | รอ 15 วิ (auto refresh) หรือ refresh หน้าเอง |
| ลืมรหัสผ่านแล้วไม่ได้อีเมล | ยังไม่ได้ตั้ง `RESEND_API_KEY` → ลิงก์อยู่ใน console ของ server (ดูวิธีเปิดอีเมลจริงด้านบน) |
| กดขอลิงก์รัวๆ แล้วไม่มีอีเมลมา | ถูกจำกัด 3 ครั้ง/ชั่วโมง — รอครบชั่วโมงแล้วขอใหม่ |
| ลิงก์ reset ขึ้น `ลิงก์นี้ใช้ไม่ได้` | ลิงก์ถูกตัดตอน copy หรือ `APP_URL` ไม่ตรงกับ URL ที่เปิดจริง |
| dev เห็น `prisma:error ... ConnectionReset` | pooler ตัด connection ที่ idle ทิ้ง Prisma ต่อใหม่เอง ไม่กระทบ request |
