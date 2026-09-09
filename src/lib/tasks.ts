import {
  PRIORITIES,
  STATUSES,
  TASK_TYPES,
  type DueBucket,
  type Priority,
  type Status,
  type TaskType,
  type Task,
  type TaskFilters,
  type TaskInput,
} from "./types";

export const MAX_TITLE_LENGTH = 200;
export const MAX_TAGS = 5;
/** งานที่ครบกำหนดภายในกี่วันถือว่า "ใกล้ถึงกำหนด" */
export const SOON_WINDOW_DAYS = 7;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ValidatedTask = {
  title: string;
  notes: string | null;
  status: Status;
  priority: Priority;
  task_type: TaskType;
  start_date: string | null;
  due_date: string | null;
  assignee_id: string | null;
  tags: string[];
};

export type ValidationResult =
  | { ok: true; value: ValidatedTask }
  | { ok: false; errors: Record<string, string> };

/** วันนี้ตามเวลาเครื่องผู้ใช้ เป็น 'YYYY-MM-DD'
 *  ห้ามใช้ toISOString() เพราะมันแปลงเป็น UTC ก่อน — คนไทยกด 00:30 จะได้วันเมื่อวาน */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** true เมื่อ string เป็นวันที่ที่ "มีอยู่จริง" — กัน 2026-02-30 ที่ผ่าน regex แต่ไม่มีในปฏิทิน */
export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** จำนวนวันจาก `from` ถึง `to` (ทั้งคู่เป็น 'YYYY-MM-DD') — ติดลบคือ to อยู่ในอดีต */
export function daysBetween(from: string, to: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

export function normalizeTags(input: string[] | string | undefined | null): string[] {
  const raw = Array.isArray(input) ? input : (input ?? "").split(",");
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of raw) {
    const tag = String(item).trim();
    if (!tag) continue;
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === MAX_TAGS) break;
  }
  return out;
}

export function validateTaskInput(input: TaskInput): ValidationResult {
  const errors: Record<string, string> = {};

  const title = (input.title ?? "").trim();
  if (!title) errors.title = "กรุณาใส่ชื่องาน";
  else if (title.length > MAX_TITLE_LENGTH)
    errors.title = `ชื่องานยาวได้ไม่เกิน ${MAX_TITLE_LENGTH} ตัวอักษร`;

  const status = (input.status ?? "todo") as Status;
  if (!STATUSES.includes(status)) errors.status = "สถานะไม่ถูกต้อง";

  const priority = (input.priority ?? "medium") as Priority;
  if (!PRIORITIES.includes(priority)) errors.priority = "ระดับความสำคัญไม่ถูกต้อง";

  const task_type = (input.task_type ?? "task") as TaskType;
  if (!TASK_TYPES.includes(task_type)) errors.task_type = "ประเภทงานไม่ถูกต้อง";

  const rawStart = (input.start_date ?? "").trim();
  let start_date: string | null = null;
  if (rawStart) {
    if (!isValidDateOnly(rawStart)) errors.start_date = "วันเริ่มต้องเป็นรูปแบบ ปปปป-ดด-วว";
    else start_date = rawStart;
  }

  const rawDue = (input.due_date ?? "").trim();
  let due_date: string | null = null;
  if (rawDue) {
    if (!isValidDateOnly(rawDue)) errors.due_date = "วันครบกำหนดต้องเป็นรูปแบบ ปปปป-ดด-วว";
    else due_date = rawDue;
  }

  if (start_date && due_date && start_date > due_date)
    errors.start_date = "วันเริ่มต้องไม่อยู่หลังวันครบกำหนด";

  const assignee_id = (input.assignee_id ?? "").trim() || null;

  const notesRaw = (input.notes ?? "").trim();
  const notes = notesRaw || null;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      notes,
      status,
      priority,
      task_type,
      start_date,
      due_date,
      assignee_id,
      tags: normalizeTags(input.tags),
    },
  };
}

export function isOverdue(task: Task, today: string): boolean {
  if (!task.due_date || task.status === "done") return false;
  return task.due_date < today;
}

export function dueBucket(task: Task, today: string): DueBucket {
  if (!task.due_date) return "none";
  // งานที่เสร็จแล้วไม่ต้องเร่ง ไม่ว่าวันจะผ่านไปนานแค่ไหน
  if (task.status === "done") return "later";

  const diff = daysBetween(today, task.due_date);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= SOON_WINDOW_DAYS) return "soon";
  return "later";
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** เรียงตามลำดับที่คนอ่านคาดหวัง:
 *  ยังไม่เสร็จก่อน → มีกำหนดส่งก่อน (ใกล้สุดขึ้นก่อน จึงได้งานเลยกำหนดอยู่บนสุดเอง)
 *  → ไม่มีกำหนดส่งเรียงตามความสำคัญ → เก่ากว่าขึ้นก่อน
 *  คืน array ใหม่เสมอ ไม่แก้ของเดิม (สำคัญกับ React state) */
export function sortTasks(tasks: Task[], today: string = todayISO()): Task[] {
  void today;
  return [...tasks].sort((a, b) => {
    const doneDiff = Number(a.status === "done") - Number(b.status === "done");
    if (doneDiff !== 0) return doneDiff;

    const hasDueDiff = Number(!a.due_date) - Number(!b.due_date);
    if (hasDueDiff !== 0) return hasDueDiff;

    if (a.due_date && b.due_date && a.due_date !== b.due_date)
      return a.due_date < b.due_date ? -1 : 1;

    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return a.created_at.localeCompare(b.created_at);
  });
}

export function filterTasks(
  tasks: Task[],
  filters: TaskFilters,
  today: string = todayISO(),
): Task[] {
  const search = (filters.search ?? "").trim().toLocaleLowerCase();
  const tag = (filters.tag ?? "").trim().toLocaleLowerCase();

  return tasks.filter((task) => {
    if (filters.status === "open" && task.status === "done") return false;
    if (
      filters.status &&
      filters.status !== "all" &&
      filters.status !== "open" &&
      task.status !== filters.status
    )
      return false;

    if (tag && !task.tags.some((t) => t.toLocaleLowerCase() === tag)) return false;

    if (search) {
      const haystack = `${task.title} ${task.notes ?? ""}`.toLocaleLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (filters.overdueOnly && !isOverdue(task, today)) return false;

    if (filters.dueFrom && (!task.due_date || task.due_date < filters.dueFrom)) return false;
    if (filters.dueTo && (!task.due_date || task.due_date > filters.dueTo)) return false;

    return true;
  });
}

export type TaskSummary = {
  total: number;
  todo: number;
  doing: number;
  done: number;
  overdue: number;
  percentDone: number;
};

export function summarize(tasks: Task[], today: string = todayISO()): TaskSummary {
  const summary: TaskSummary = {
    total: tasks.length,
    todo: 0,
    doing: 0,
    done: 0,
    overdue: 0,
    percentDone: 0,
  };

  for (const task of tasks) {
    summary[task.status] += 1;
    if (isOverdue(task, today)) summary.overdue += 1;
  }

  summary.percentDone =
    summary.total === 0 ? 0 : Math.round((summary.done / summary.total) * 100);

  return summary;
}

/** รวมแท็กทั้งหมดที่ใช้อยู่ เอาไปทำปุ่มกรอง */
export function collectTags(tasks: Task[]): string[] {
  const seen = new Map<string, string>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      const key = tag.toLocaleLowerCase();
      if (!seen.has(key)) seen.set(key, tag);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "th"));
}
