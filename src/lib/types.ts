export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["todo", "doing", "done"] as const;
export type Status = (typeof STATUSES)[number];

/** วันที่แบบ 'YYYY-MM-DD' (Postgres `date`) — เก็บเป็น string ไม่ใช่ Date
 *  เพื่อไม่ให้ timezone ของ browser เลื่อนวันครบกำหนดไปวันอื่น */
export type DateOnly = string;

export type Task = {
  id: string;
  list_id: string;
  title: string;
  notes: string | null;
  status: Status;
  priority: Priority;
  due_date: DateOnly | null;
  tags: string[];
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskList = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

export type ListMember = {
  list_id: string;
  user_id: string;
  role: "owner" | "editor";
  email: string | null;
  display_name: string | null;
};

export type TaskInput = {
  title: string;
  notes?: string | null;
  status?: Status;
  priority?: Priority;
  due_date?: string | null;
  tags?: string[] | string;
};

export type DueBucket = "none" | "overdue" | "today" | "soon" | "later";

export type TaskFilters = {
  status?: Status | "all" | "open";
  tag?: string | null;
  search?: string;
  overdueOnly?: boolean;
};
