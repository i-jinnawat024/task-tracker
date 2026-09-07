# Task Tracker

ลิสต์งานที่แชร์กันได้ 2 คน — Next.js 15 (App Router) + Prisma + Postgres

**ฟีเจอร์:** เพิ่ม/แก้/ลบ/ติ๊กเสร็จ · กำหนดวันเสร็จ + ไฮไลต์งานเลยกำหนด · ความสำคัญ 3 ระดับ + แท็ก · แชร์ลิสต์ให้อีกคนแก้ร่วมกันได้ · login ด้วยอีเมล+รหัสผ่าน

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

แอปไม่ส่งอีเมลเชิญ — ต้องบอกเขาเองว่าให้ไปสมัคร (ไม่อยากให้แอปกลายเป็นเครื่องมือยิง spam
และการส่งอีเมลต้องมี provider เพิ่มอีกตัว)

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
pnpm test           # unit test (60 เคส)
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

**ไม่มี realtime** — Prisma ทำ realtime ไม่ได้ [`Board.tsx`](src/components/Board.tsx)
จึง `router.refresh()` ทุก 15 วิ (เฉพาะตอนแท็บ visible) ซึ่งพอสำหรับใช้กัน 2 คน

---

## โครงไฟล์

```
prisma/
  schema.prisma        โมเดล User / Session / List / ListMember / Task
  migrations/
src/
  app/
    actions.ts         Server Actions ทั้งหมด (auth + task + sharing)
    board/page.tsx     ดึงข้อมูลฝั่ง server
    login/page.tsx
  components/          Board / TaskItem / NewTaskForm / ShareBox / AuthForm
  lib/
    tasks.ts           logic บริสุทธิ์: validate, sort, filter, overdue, summary
    types.ts
    auth/
      index.ts         registerUser / loginUser
      credentials.ts   validate + normalize อีเมล-รหัสผ่าน
      password.ts      scrypt hash/verify + session token
      session.ts       สร้าง/อ่าน/ลบ session (แตะ cookie + DB)
      cookie.ts        ชื่อ cookie เฉยๆ — แยกไว้ให้ Edge import ได้
    db/
      access.ts        requireAccess() — ด่านตรวจสิทธิ์
      lists.ts         query/mutation ทั้งหมด (เรียก assertAccess ก่อนทุกครั้ง)
      map.ts           Prisma row → Task (จัดการเรื่องวันที่)
      prisma.ts        client singleton
  middleware.ts        ด่านหน้า: ไม่มี cookie ก็ไม่ให้เข้า /board
tests/                 60 เคส — logic, สิทธิ์, การแปลงวันที่, hash รหัสผ่าน, validate
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
| ลืมรหัสผ่าน | ยังไม่มีฟีเจอร์ reset (ต้องมี email provider) — แก้ผ่าน `pnpm db:studio` ชั่วคราว |
