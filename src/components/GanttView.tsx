"use client";

import { useState } from "react";
import { daysBetween } from "@/lib/tasks";
import type { ListMember, Task } from "@/lib/types";
import TaskItem from "./TaskItem";

const DAY = 86_400_000;
function shift(date: string, days: number) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);
}
function label(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
}
const colors = { todo: "bg-indigo-500", doing: "bg-amber-500", done: "bg-emerald-500" };
const RANGE_DAYS = 14;

export default function GanttView({ tasks, today, members = [] }: { tasks: Task[]; today: string; members?: ListMember[] }) {
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const start = shift(today, offset - 2);
  const end = shift(start, RANGE_DAYS - 1);
  const dates = Array.from({ length: RANGE_DAYS }, (_, index) => shift(start, index));
  const scheduled = tasks.filter((task) => task.due_date);
  const unscheduled = tasks.filter((task) => !task.due_date);
  const selected = tasks.find((task) => task.id === selectedId);

  return <section className="card overflow-hidden" aria-label="Gantt chart">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{label(start)} – {label(end)} {end.slice(0, 4)}</h2>
      </div>
      <div className="flex gap-1">
        <button type="button" aria-label="ก่อนหน้า 2 สัปดาห์" onClick={() => setOffset(offset - RANGE_DAYS)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 bg-white text-xs text-slate-500 hover:bg-slate-50">←</button>
        <button type="button" onClick={() => setOffset(0)} className="h-7 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">วันนี้</button>
        <button type="button" aria-label="ถัดไป 2 สัปดาห์" onClick={() => setOffset(offset + RANGE_DAYS)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 bg-white text-xs text-slate-500 hover:bg-slate-50">→</button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="sticky left-0 z-20 w-44 shrink-0 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">งาน</div>
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${RANGE_DAYS}, minmax(0, 1fr))` }}>
            {dates.map((date) => <div key={date} className={`border-l border-slate-200 py-2 text-center text-[10px] ${date === today ? 'bg-indigo-100 font-bold text-indigo-700' : 'text-slate-400'}`}>
              {date.slice(8)}
            </div>)}
          </div>
        </div>
        {scheduled.map((task) => {
          const due = task.due_date!;
          const from = task.start_date && task.start_date < due ? task.start_date : due;
          const left = Math.max(0, daysBetween(start, from));
          const right = Math.min(RANGE_DAYS - 1, daysBetween(start, due));
          const inRange = right >= left;
          return <div key={task.id} className="flex border-b border-slate-100">
            <button type="button" onClick={() => setSelectedId(task.id)} className="sticky left-0 z-20 w-44 shrink-0 bg-white px-3 py-2 text-left hover:bg-slate-50">
              <span className="block truncate text-xs font-medium text-slate-700">{task.title}</span>
            </button>
            <div className="relative min-h-10 flex-1" style={{ backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px)', backgroundSize: `${100 / RANGE_DAYS}% 100%` }}>
              {dates.includes(today) && <div className="pointer-events-none absolute inset-y-0 border-l-2 border-indigo-300" style={{ left: `${daysBetween(start, today) / RANGE_DAYS * 100}%` }} />}
              {inRange ? <button type="button" onClick={() => setSelectedId(task.id)}
                aria-label={`${task.title}: ${label(from)} ถึง ${label(due)}`}
                title={`${task.title}: ${from} → ${due}`}
                className={`absolute top-2.5 h-5 overflow-hidden rounded px-1.5 text-left text-[10px] text-white shadow-sm hover:brightness-110 ${colors[task.status]}`}
                style={{ left: `${left / RANGE_DAYS * 100}%`, width: `${(right - left + 1) / RANGE_DAYS * 100}%` }}>
                <span className="whitespace-nowrap">{task.title}</span>
              </button> : <button type="button" onClick={() => setOffset(daysBetween(today, due))} className="m-3 text-xs text-indigo-600 hover:underline">อยู่นอกช่วง · ไปวันครบกำหนด {label(due)} →</button>}
            </div>
          </div>;
        })}
      </div>
    </div>
    {!scheduled.length && <p className="p-6 text-center text-sm text-slate-400">เพิ่มวันครบกำหนดให้งานเพื่อแสดงบน Gantt chart</p>}
    <div className="flex flex-wrap gap-3 px-3 py-2 text-[11px] text-slate-500">
      {([['todo', 'ที่ต้องทำ'], ['doing', 'กำลังทำ'], ['done', 'เสร็จแล้ว']] as const).map(([status, text]) => <span key={status} className="flex items-center gap-1.5"><span className={`h-2 w-3 rounded ${colors[status]}`} />{text}</span>)}
    </div>
    {selected && <div className="border-t border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">รายละเอียดงาน</h3><button type="button" className="btn-ghost text-xs" onClick={() => setSelectedId(null)}>ปิด</button></div>
      <ul><TaskItem key={selected.id} task={selected} today={today} members={members} /></ul>
    </div>}
    {unscheduled.length > 0 && <details className="border-t border-slate-200 p-4">
      <summary className="cursor-pointer text-sm text-slate-600">ยังไม่กำหนดวัน ({unscheduled.length})</summary>
      <ul className="mt-3 space-y-2">{unscheduled.map((task) => <TaskItem key={task.id} task={task} today={today} members={members} />)}</ul>
    </details>}
  </section>;
}
