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
import ListSwitcher from "./ListSwitcher";
import NewTaskForm from "./NewTaskForm";
import ShareBox from "./ShareBox";
import TaskItem from "./TaskItem";
import KanbanView from "./KanbanView";
import GanttView from "./GanttView";

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
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => {
      const current = new Date();
      setToday(todayISO(current));
      setNow(current);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const [status, setStatus] = useState<Status | "open" | "all">("all");
  const [view, setView] = useState<"list" | "kanban" | "gantt">("kanban");
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
    <main className={`mx-auto px-3 pb-20 pt-3 sm:px-6 sm:pb-24 sm:pt-5 ${view === "list" ? "max-w-3xl" : "max-w-7xl"}`}>
      <header className="mb-3 flex items-start justify-between gap-2 sm:mb-4 sm:items-center sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{activeList.name}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {user.displayName ?? user.email}
            {members.length > 1 && ` · แชร์กับ ${members.length - 1} คน`}
          </p>
          </div>
          {now && (
            <div className="hidden shrink-0 border-l border-slate-300 pl-3 min-[430px]:block" aria-label="วันเวลาปัจจุบัน">
              <p className="text-xs font-medium text-slate-600">
                {now.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <p className="text-[11px] tabular-nums text-slate-400">
                {now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
              </p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {lists.length > 1 && (
            <ListSwitcher
              lists={lists}
              activeId={activeList.id}
              onSelect={(id) => router.push(`/board?list=${id}`)}
            />
          )}
          <form action={signOut}>
            <button type="submit" className="btn-ghost px-2.5 py-1.5 text-xs sm:px-3.5">
              <span className="hidden min-[390px]:inline">ออกจากระบบ</span>
              <span className="min-[390px]:hidden" aria-hidden>ออก</span>
            </button>
          </form>
        </div>
      </header>

      <section className="card mb-3 p-3 sm:mb-4 sm:p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-bold leading-none text-slate-900 sm:text-3xl">
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

      <div className="my-3 flex justify-end">
        <NewTaskForm listId={activeList.id} members={members} />
      </div>

      <div className="mb-3 mt-5 space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex sm:w-auto" aria-label="มุมมองงาน">
            {([['kanban', 'Kanban'], ['gantt', 'Gantt chart'], ['list', 'List']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${view === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>
          <span className="self-end text-[11px] text-slate-500 sm:self-auto sm:text-xs">แสดง {visible.length} จาก {tasks.length} งาน</span>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`min-w-0 flex-1 rounded-md px-1 py-1.5 text-[11px] font-medium transition sm:text-xs ${
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
            className="field min-w-0 flex-1 py-1.5 text-xs"
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

      {view === "list" && <ul className="space-y-2">
        {visible.map((task) => (
          <TaskItem key={task.id} task={task} today={today} members={members} />
        ))}
      </ul>}
      {view === "kanban" && <KanbanView tasks={visible} today={today} members={members} />}
      {view === "gantt" && <GanttView tasks={visible} today={today} members={members} />}

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
