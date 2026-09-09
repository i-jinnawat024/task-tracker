import { describe, expect, it } from "vitest";
import {
  dueBucket,
  filterTasks,
  isOverdue,
  normalizeTags,
  sortTasks,
  summarize,
  todayISO,
  validateTaskInput,
} from "@/lib/tasks";
import type { Priority, Status, Task } from "@/lib/types";

const TODAY = "2026-09-07";

function task(over: Partial<Task> & { id: string }): Task {
  return {
    list_id: "list-1",
    title: "งาน",
    notes: null,
    status: "todo",
    priority: "medium",
    task_type: "task",
    start_date: null,
    due_date: null,
    assignee_id: null,
    tags: [],
    created_by: "user-1",
    completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...over,
  };
}

describe("validateTaskInput", () => {
  it("ต้อง trim title และคืนค่า default ให้ status/priority/tags", () => {
    const result = validateTaskInput({ title: "  ซื้อของ  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      title: "ซื้อของ",
      status: "todo",
      priority: "medium",
      task_type: "task",
      start_date: null,
      due_date: null,
      assignee_id: null,
      notes: null,
      tags: [],
    });
  });

  it("ปฏิเสธ title ว่างหรือมีแต่ช่องว่าง", () => {
    for (const title of ["", "   ", "\n\t"]) {
      const result = validateTaskInput({ title });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.title).toBe("กรุณาใส่ชื่องาน");
    }
  });

  it("ปฏิเสธ title ที่ยาวเกิน 200 ตัวอักษร", () => {
    const result = validateTaskInput({ title: "ก".repeat(201) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.title).toContain("200");
  });

  it("ปฏิเสธ priority / status ที่ไม่อยู่ใน enum", () => {
    const bad = validateTaskInput({
      title: "งาน",
      priority: "urgent" as Priority,
      status: "archived" as Status,
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.errors.priority).toBeTruthy();
    expect(bad.errors.status).toBeTruthy();
  });

  it("ปฏิเสธ due_date ที่ผิดรูปแบบ หรือเป็นวันที่ไม่มีจริง", () => {
    for (const due of ["7/9/2026", "2026-9-7", "2026-02-30", "วันนี้"]) {
      const result = validateTaskInput({ title: "งาน", due_date: due });
      expect(result.ok, `due_date=${due} ควรไม่ผ่าน`).toBe(false);
    }
  });

  it("ยอมรับ due_date ที่ถูกต้อง และแปลงค่าว่างเป็น null", () => {
    const ok = validateTaskInput({ title: "งาน", due_date: "2026-02-28" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.due_date).toBe("2026-02-28");

    const blank = validateTaskInput({ title: "งาน", due_date: "" });
    expect(blank.ok).toBe(true);
    if (blank.ok) expect(blank.value.due_date).toBeNull();
  });

  it("แปลง notes ว่างเป็น null และ trim ค่าที่มี", () => {
    const blank = validateTaskInput({ title: "งาน", notes: "   " });
    expect(blank.ok).toBe(true);
    if (blank.ok) expect(blank.value.notes).toBeNull();

    const filled = validateTaskInput({ title: "งาน", notes: " ซื้อที่ 7-11 " });
    expect(filled.ok).toBe(true);
    if (filled.ok) expect(filled.value.notes).toBe("ซื้อที่ 7-11");
  });
});

describe("normalizeTags", () => {
  it("รับ string คั่นด้วย comma, trim, ตัดค่าว่าง, ตัดซ้ำแบบไม่สนตัวพิมพ์", () => {
    expect(normalizeTags(" บ้าน , งาน ,, บ้าน , Work , work ")).toEqual([
      "บ้าน",
      "งาน",
      "Work",
    ]);
  });

  it("รับ array และจำกัดไม่เกิน 5 แท็ก", () => {
    expect(normalizeTags(["a", "b", "c", "d", "e", "f", "g"])).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("คืน array ว่างเมื่อไม่มีค่า", () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags("")).toEqual([]);
    expect(normalizeTags("  ,  , ")).toEqual([]);
  });
});

describe("isOverdue / dueBucket", () => {
  it("งานที่กำหนดส่งก่อนวันนี้และยังไม่เสร็จ = เลยกำหนด", () => {
    expect(isOverdue(task({ id: "1", due_date: "2026-09-06" }), TODAY)).toBe(true);
  });

  it("งานที่เสร็จแล้วไม่นับว่าเลยกำหนด แม้วันจะผ่านไปแล้ว", () => {
    expect(
      isOverdue(task({ id: "1", due_date: "2026-01-01", status: "done" }), TODAY),
    ).toBe(false);
  });

  it("งานที่ครบกำหนดวันนี้ยังไม่เลยกำหนด", () => {
    expect(isOverdue(task({ id: "1", due_date: TODAY }), TODAY)).toBe(false);
  });

  it("งานที่ไม่มีกำหนดส่งไม่เลยกำหนด", () => {
    expect(isOverdue(task({ id: "1", due_date: null }), TODAY)).toBe(false);
  });

  it("จัด bucket ตามระยะเวลาที่เหลือ", () => {
    expect(dueBucket(task({ id: "1", due_date: null }), TODAY)).toBe("none");
    expect(dueBucket(task({ id: "2", due_date: "2026-08-31" }), TODAY)).toBe("overdue");
    expect(dueBucket(task({ id: "3", due_date: TODAY }), TODAY)).toBe("today");
    expect(dueBucket(task({ id: "4", due_date: "2026-09-10" }), TODAY)).toBe("soon");
    expect(dueBucket(task({ id: "5", due_date: "2026-12-01" }), TODAY)).toBe("later");
    expect(
      dueBucket(task({ id: "6", due_date: "2026-01-01", status: "done" }), TODAY),
    ).toBe("later");
  });
});

describe("sortTasks", () => {
  it("เรียง: ยังไม่เสร็จก่อนเสร็จ > เลยกำหนดก่อน > ครบกำหนดใกล้ก่อน > priority สูงก่อน", () => {
    const tasks = [
      task({ id: "done-old", status: "done", due_date: "2026-09-02" }),
      task({ id: "no-due-low", priority: "low" }),
      task({ id: "today", due_date: TODAY }),
      task({ id: "overdue", due_date: "2026-09-01" }),
      task({ id: "no-due-high", priority: "high" }),
      task({ id: "next-week", due_date: "2026-09-14" }),
    ];
    expect(sortTasks(tasks, TODAY).map((t) => t.id)).toEqual([
      "overdue",
      "today",
      "next-week",
      "no-due-high",
      "no-due-low",
      "done-old",
    ]);
  });

  it("ตัดสินด้วย created_at เมื่อทุกอย่างเท่ากัน และไม่แก้ array เดิม", () => {
    const input = [
      task({ id: "b", created_at: "2026-09-05T00:00:00Z" }),
      task({ id: "a", created_at: "2026-09-02T00:00:00Z" }),
    ];
    expect(sortTasks(input, TODAY).map((t) => t.id)).toEqual(["a", "b"]);
    expect(input.map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("filterTasks", () => {
  const tasks = [
    task({
      id: "1",
      title: "ซื้อนมสด",
      tags: ["บ้าน"],
      status: "todo",
      due_date: "2026-09-01",
    }),
    task({ id: "2", title: "ส่งรายงาน", tags: ["งาน"], status: "doing" }),
    task({ id: "3", title: "ล้างรถ", tags: ["บ้าน"], status: "done" }),
  ];

  it("กรองตาม status และรองรับ open = ยังไม่เสร็จ", () => {
    expect(filterTasks(tasks, { status: "done" }, TODAY).map((t) => t.id)).toEqual(["3"]);
    expect(filterTasks(tasks, { status: "open" }, TODAY).map((t) => t.id)).toEqual([
      "1",
      "2",
    ]);
    expect(filterTasks(tasks, { status: "all" }, TODAY)).toHaveLength(3);
  });

  it("กรองตามแท็ก และค้นหาจากชื่อแบบไม่สนตัวพิมพ์ใหญ่เล็ก", () => {
    expect(filterTasks(tasks, { tag: "บ้าน" }, TODAY).map((t) => t.id)).toEqual(["1", "3"]);
    expect(filterTasks(tasks, { search: "รายงาน" }, TODAY).map((t) => t.id)).toEqual(["2"]);
    expect(filterTasks(tasks, { search: "  " }, TODAY)).toHaveLength(3);
  });

  it("กรองเฉพาะงานเลยกำหนด", () => {
    expect(filterTasks(tasks, { overdueOnly: true }, TODAY).map((t) => t.id)).toEqual(["1"]);
  });

  it("กรองตามช่วงวันครบกำหนดและไม่นับงานที่ไม่มีวันครบกำหนด", () => {
    const dated = [
      ...tasks,
      task({ id: "4", due_date: "2026-09-07" }),
      task({ id: "5", due_date: "2026-09-12" }),
    ];
    expect(filterTasks(dated, { dueFrom: "2026-09-02", dueTo: "2026-09-10" }, TODAY).map((t) => t.id)).toEqual(["4"]);
    expect(filterTasks(dated, { dueFrom: "2026-09-07" }, TODAY).map((t) => t.id)).toEqual(["4", "5"]);
    expect(filterTasks(dated, { dueTo: "2026-09-01" }, TODAY).map((t) => t.id)).toEqual(["1"]);
  });

  it("รวมหลายเงื่อนไขแบบ AND", () => {
    expect(
      filterTasks(tasks, { status: "open", tag: "บ้าน", search: "นม" }, TODAY).map(
        (t) => t.id,
      ),
    ).toEqual(["1"]);
  });
});

describe("summarize", () => {
  it("นับยอดแต่ละสถานะ งานเลยกำหนด และ % ที่เสร็จ (ปัดเป็นจำนวนเต็ม)", () => {
    const tasks = [
      task({ id: "1", status: "done" }),
      task({ id: "2", status: "doing", due_date: "2026-09-01" }),
      task({ id: "3", status: "todo" }),
    ];
    expect(summarize(tasks, TODAY)).toEqual({
      total: 3,
      todo: 1,
      doing: 1,
      done: 1,
      overdue: 1,
      percentDone: 33,
    });
  });

  it("ไม่หารด้วยศูนย์เมื่อไม่มีงาน", () => {
    expect(summarize([], TODAY)).toEqual({
      total: 0,
      todo: 0,
      doing: 0,
      done: 0,
      overdue: 0,
      percentDone: 0,
    });
  });
});

describe("todayISO", () => {
  it("คืนวันที่ตามเวลาท้องถิ่นเป็น YYYY-MM-DD (ไม่ใช่ UTC)", () => {
    // 2026-09-07 00:30 เวลาไทย = 2026-09-06T17:30Z — ต้องได้ 09-07 ไม่ใช่ 09-06
    expect(todayISO(new Date(2026, 8, 7, 0, 30, 0))).toBe("2026-09-07");
    expect(todayISO(new Date(2026, 0, 1, 23, 59, 59))).toBe("2026-01-01");
  });
});
