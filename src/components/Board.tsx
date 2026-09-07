"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/actions";
import type { CurrentUser } from "@/lib/auth";
import {
  collectTags,
  filterTasks,
  sortTasks,
  summarize,
  todayISO,
} from "@/lib/tasks";
import type { ListMember, Status, Task, TaskList } from "@/lib/types";
import NewTaskForm from "./NewTaskForm";
import ShareBox from "./ShareBox";
import TaskItem from "./TaskItem";

type Props = {
  user: CurrentUser;
  lists: TaskList[];
  activeList: TaskList;
  tasks: Task[];
  members: ListMember[];
  today: string;
};

const STATUS_TABS: { value: Status | "open" | "all"; label: string }[] = [
  { value: "open", label: "ที่ต้องทำ" },
  { value: "doing", label: "กำลังทำ" },
  { value: "done", label: "เสร็จแล้ว" },
  { value: "all", label: "ทั้งหมด" },
];

const AUTO_REFRESH_MS = 15_000;

export default function Board({
  user,
  lists,
  activeList,
  tasks,
  members,
  today: serverToday,
}: Props) {
  const router = useRouter();

  // server กับ browser อาจอยู่ต่าง timezone — render ครั้งแรกใช้ค่าจาก server
  // เพื่อไม่ให้ hydration mismatch แล้วค่อยแก้เป็นวันของเครื่องผู้ใช้หลัง mount
  const [today, setToday] = useState(serverToday);
  useEffect(() => setToday(todayISO()), []);

  const [status, setStatus] = useState<Status | "open" | "all">("open");
  const [tag, setTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // แทน realtime ของ Supabase: ดึงข้อมูลใหม่เป็นระยะ ให้เห็นงานที่อีกคนเพิ่ม
  // ใช้กัน 2 คน 15 วิ/ครั้งถือว่าคุ้มกว่าการต้องเปิด RLS + websocket ทั้งชุด
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const summary = useMemo(() => summarize(tasks, today), [tasks, today]);
  const allTags = useMemo(() => collectTags(tasks), [tasks]);
  const visible = useMemo(
    () => sortTasks(filterTasks(tasks, { status, tag, search, overdueOnly }, today), today),
    [tasks, status, tag, search, overdueOnly, today],
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{activeList.name}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {user.displayName ?? user.email}
            {members.length > 1 && ` · แชร์กับ ${members.length - 1} คน`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lists.length > 1 && (
            <select
              className="field w-auto py-1.5 text-xs"
              value={activeList.id}
              onChange={(e) => router.push(`/board?list=${e.target.value}`)}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
          <form action={signOut}>
            <button type="submit" className="btn-ghost py-1.5 text-xs">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </header>

      <section className="card mb-4 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold leading-none text-slate-900">
              {summary.done}
              <span className="text-base font-medium text-slate-400"> / {summary.total}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">งานที่เสร็จแล้ว</p>
          </div>
          <div className="text-right text-xs">
            {summary.overdue > 0 ? (
              <p className="font-semibold text-rose-600">เลยกำหนด {summary.overdue} งาน</p>
            ) : (
              <p className="text-emerald-600">ไม่มีงานเลยกำหนด 🎉</p>
            )}
            <p className="mt-1 text-slate-400">{summary.percentDone}% เสร็จแล้ว</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${summary.percentDone}%` }}
          />
        </div>
      </section>

      <NewTaskForm listId={activeList.id} />

      <div className="mb-3 mt-5 space-y-2.5">
        <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                status === tab.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหางาน…"
            className="field flex-1 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={() => setOverdueOnly((v) => !v)}
            className={`chip ${overdueOnly ? "chip-on" : ""}`}
          >
            เลยกำหนด
          </button>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTag(null)}
              className={`chip ${tag === null ? "chip-on" : ""}`}
            >
              ทุกแท็ก
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t === tag ? null : t)}
                className={`chip ${tag === t ? "chip-on" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {visible.map((task) => (
          <TaskItem key={task.id} task={task} today={today} />
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="card py-10 text-center text-sm text-slate-400">
          {tasks.length === 0 ? "ยังไม่มีงาน — เพิ่มงานแรกเลย" : "ไม่มีงานที่ตรงกับตัวกรอง"}
        </p>
      )}

      <ShareBox
        listId={activeList.id}
        members={members}
        currentUserId={user.id}
        isOwner={activeList.owner_id === user.id}
      />
    </main>
  );
}
