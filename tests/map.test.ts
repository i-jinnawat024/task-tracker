import { describe, expect, it } from "vitest";
import { mapTask, parseDateOnly, toDateOnly } from "@/lib/db/map";

describe("toDateOnly", () => {
  it("อ่านค่าคอลัมน์ date ของ Postgres (UTC midnight) เป็น YYYY-MM-DD ตรงตัว", () => {
    // Prisma คืนค่า @db.Date มาเป็น Date ที่ UTC 00:00 ของวันนั้น
    // ถ้าเผลอใช้ getDate() (local) แล้ว browser อยู่ UTC-5 จะเพี้ยนไป 1 วัน
    expect(toDateOnly(new Date("2026-09-07T00:00:00.000Z"))).toBe("2026-09-07");
    expect(toDateOnly(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01-01");
    expect(toDateOnly(new Date("2026-12-31T00:00:00.000Z"))).toBe("2026-12-31");
  });

  it("เติมศูนย์หน้าเดือน/วันที่เป็นเลขหลักเดียว", () => {
    expect(toDateOnly(new Date("2026-03-05T00:00:00.000Z"))).toBe("2026-03-05");
  });

  it("คืน null เมื่อไม่มีวันครบกำหนด", () => {
    expect(toDateOnly(null)).toBeNull();
  });
});

describe("parseDateOnly", () => {
  it("แปลง YYYY-MM-DD เป็น Date ที่ UTC midnight เพื่อเขียนลงคอลัมน์ date", () => {
    const d = parseDateOnly("2026-09-07");
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });

  it("ไป-กลับแล้วต้องได้ค่าเดิม (round-trip)", () => {
    for (const iso of ["2026-01-01", "2026-02-28", "2026-06-30", "2026-12-31"]) {
      expect(toDateOnly(parseDateOnly(iso))).toBe(iso);
    }
  });

  it("คืน null เมื่อค่าเป็น null หรือ string ว่าง", () => {
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly("")).toBeNull();
  });
});

describe("mapTask", () => {
  const row = {
    id: "task-1",
    listId: "list-1",
    title: "ซื้อของ",
    notes: null,
    status: "todo" as const,
    priority: "high" as const,
    dueDate: new Date("2026-09-10T00:00:00.000Z"),
    tags: ["บ้าน"],
    createdById: "user-1",
    completedAt: null,
    createdAt: new Date("2026-09-01T03:04:05.000Z"),
    updatedAt: new Date("2026-09-02T03:04:05.000Z"),
  };

  it("แปลง row ของ Prisma เป็น Task ที่ส่งข้าม server→client ได้ (ทุกฟิลด์เป็น primitive)", () => {
    expect(mapTask(row)).toEqual({
      id: "task-1",
      list_id: "list-1",
      title: "ซื้อของ",
      notes: null,
      status: "todo",
      priority: "high",
      due_date: "2026-09-10",
      tags: ["บ้าน"],
      created_by: "user-1",
      completed_at: null,
      created_at: "2026-09-01T03:04:05.000Z",
      updated_at: "2026-09-02T03:04:05.000Z",
    });
  });

  it("ไม่มี Date object หลงเหลืออยู่ในผลลัพธ์", () => {
    for (const value of Object.values(mapTask(row))) {
      expect(value).not.toBeInstanceOf(Date);
    }
  });

  it("รองรับ task ที่เสร็จแล้วและไม่มีกำหนดส่ง", () => {
    const done = mapTask({
      ...row,
      dueDate: null,
      status: "done" as const,
      completedAt: new Date("2026-09-05T10:00:00.000Z"),
    });
    expect(done.due_date).toBeNull();
    expect(done.completed_at).toBe("2026-09-05T10:00:00.000Z");
  });
});
