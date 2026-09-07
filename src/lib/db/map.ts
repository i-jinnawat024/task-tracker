import type { Priority, Status, Task } from "@/lib/types";

/** shape ที่ Prisma คืนมาจากตาราง tasks (เขียนมือไว้เพื่อให้ test ไม่ต้องพึ่ง generated client) */
export type TaskRow = {
  id: string;
  listId: string;
  title: string;
  notes: string | null;
  status: Status;
  priority: Priority;
  dueDate: Date | null;
  tags: string[];
  createdById: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** คอลัมน์ `date` ของ Postgres → 'YYYY-MM-DD'
 *  Prisma คืนค่ามาเป็น Date ที่ UTC 00:00 ของวันนั้น จึงต้องอ่านด้วย getUTC*
 *  ถ้าใช้ getDate() (local) เครื่องที่ offset ติดลบจะเห็นวันเลื่อนไป 1 วัน */
export function toDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → Date ที่ UTC 00:00 สำหรับเขียนลงคอลัมน์ `date` (ผกผันกับ toDateOnly) */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

/** Prisma row → Task ที่เป็น primitive ล้วน ส่งจาก Server Component ไป Client Component ได้
 *  ไม่ปล่อย Date object ข้าม boundary เพื่อให้ค่าที่ client เห็นตรงกับที่ server เห็นเป๊ะ */
export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    list_id: row.listId,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    due_date: toDateOnly(row.dueDate),
    tags: row.tags,
    created_by: row.createdById,
    completed_at: row.completedAt ? row.completedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
