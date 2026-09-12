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
import FiltersPanel from "./FiltersPanel";
import ListSwitcher from "./ListSwitcher";
import NewTaskForm from "./NewTaskForm";
import ShareBox from "./ShareBox";
import TaskItem from "./TaskItem";
import KanbanView from "./KanbanView";
import GanttView from "./GanttView";
import WeekView from "./WeekView";

type Props = {
  user: CurrentUser;
  lists: TaskList[];
  activeList: TaskList;
  tasks: Task[];
  members: ListMember[];
  today: string;
};

const AUTO_REFRESH_MS = 15_000;
const VIEW_STORAGE_KEY = "task-tracker-view";
type ViewOption = "list" | "kanban" | "gantt" | "week";
const VIEW_OPTIONS: ViewOption[] = ["list", "kanban", "gantt", "week"];
const DEFAULT_VIEW: ViewOption = "week";

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
  const [view, setView] = useState<ViewOption>(DEFAULT_VIEW);

  // จำมุมมองล่าสุดที่ user เลือกไว้ต่อเครื่อง — default เป็น Week ถ้ายังไม่เคยเลือก
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved && (VIEW_OPTIONS as string[]).includes(saved)) setView(saved as ViewOption);
  }, []);

  function selectView(next: ViewOption) {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  const [tag, setTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    () => sortTasks(filterTasks(tasks, { status, tag, search, overdueOnly, dueFrom, dueTo }, today), today),
    [tasks, status, tag, search, overdueOnly, dueFrom, dueTo, today],
  );
  const activeFilterCount = Number(status !== "all") + Number(Boolean(tag)) + Number(overdueOnly) + Number(Boolean(dueFrom || dueTo));
  function clearFilters() {
    setStatus("all");
    setOverdueOnly(false);
    setDueFrom("");
    setDueTo("");
  }
  const doneWidth = summary.total ? (summary.done / summary.total) * 100 : 0;
  const doingWidth = summary.total ? (summary.doing / summary.total) * 100 : 0;

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

      <section className="card mb-3 p-3 sm:mb-4 sm:p-4" aria-label="สรุปงาน">
        <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700">
          {([
            ["งานทั้งหมด", summary.total, "text-slate-900"],
            ["เสร็จแล้ว", summary.done, "text-emerald-600"],
            ["เกินกำหนด", summary.overdue, summary.overdue ? "text-rose-600" : "text-slate-900"],
          ] as const).map(([label, value, color]) => (
            <div key={label} className="px-2 first:pl-0 last:pr-0 sm:px-4">
              <p className={`text-xl font-bold tabular-nums sm:text-2xl ${color}`}>{value}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-200" aria-label={`กำลังทำ ${summary.doing} งาน เสร็จแล้ว ${summary.done} งาน`}>
          <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${doingWidth}%` }} />
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${doneWidth}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />กำลังทำ {summary.doing}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />เสร็จแล้ว {summary.done} ({summary.percentDone}%)</span>
          <span className="ml-auto text-slate-400">เหลือ {summary.todo}</span>
        </div>
      </section>

      <div className="my-3 flex justify-end">
        <NewTaskForm listId={activeList.id} members={members} />
      </div>

      <div className="mb-3 mt-5 space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex sm:w-auto" aria-label="มุมมองงาน">
            {([['kanban', 'Kanban'], ['gantt', 'Gantt chart'], ['week', 'Week'], ['list', 'List']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={view === value} onClick={() => selectView(value)}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${view === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <span className="self-end text-[11px] text-slate-500 sm:self-auto sm:text-xs">แสดง {visible.length} จาก {tasks.length} งาน</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหางาน…"
            className="field min-w-0 flex-1 py-1.5 text-xs"
          />
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              aria-expanded={filtersOpen}
              className={`btn-ghost relative py-1.5 text-xs ${filtersOpen || activeFilterCount ? "border-indigo-300 text-indigo-700" : ""}`}
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden><path d="M3 5h14M5.5 10h9M8 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              ตัวกรอง
              {activeFilterCount > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[9px] text-white">{activeFilterCount}</span>}
            </button>
            {filtersOpen && (
              <FiltersPanel
                status={status}
                onStatusChange={setStatus}
                overdueOnly={overdueOnly}
                onOverdueOnlyChange={setOverdueOnly}
                dueFrom={dueFrom}
                onDueFromChange={setDueFrom}
                dueTo={dueTo}
                onDueToChange={setDueTo}
                onClear={clearFilters}
                onClose={() => setFiltersOpen(false)}
              />
            )}
          </div>
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
      {view === "week" && <WeekView tasks={visible} today={today} members={members} listId={activeList.id} />}

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
