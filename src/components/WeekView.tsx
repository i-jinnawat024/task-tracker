"use client";

import { useState } from "react";
import type { ListMember, Task } from "@/lib/types";
import NewTaskForm from "./NewTaskForm";
import TaskDetailModal from "./TaskDetailModal";
import TaskItem from "./TaskItem";
import { PRIORITY_OPTIONS } from "./taskFormOptions";

const PRIORITY_STYLE = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.color])) as Record<string, string>;
const PRIORITY_LABEL = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.label])) as Record<string, string>;

const DAY = 86_400_000;
function shift(date: string, days: number) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);
}
function label(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
}
function weekdayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("th-TH", { weekday: "short", timeZone: "UTC" });
}
/** จันทร์ของสัปดาห์ที่ครอบคลุม `date` — ใช้ getUTCDay() (0=อาทิตย์) แล้วเลื่อนกลับให้ตรงจันทร์ */
function mondayOf(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const diffToMonday = (day + 6) % 7;
  return shift(date, -diffToMonday);
}

export default function WeekView({ tasks, today, members = [], listId }: { tasks: Task[]; today: string; members?: ListMember[]; listId: string }) {
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const start = shift(mondayOf(today), offset * 7);
  const end = shift(start, 6);
  const dates = Array.from({ length: 7 }, (_, index) => shift(start, index));
  const scheduled = tasks.filter((task) => task.due_date);
  const unscheduled = tasks.filter((task) => !task.due_date);
  const selected = tasks.find((task) => task.id === selectedId);

  return (
    <section className="card overflow-hidden" aria-label="สัปดาห์">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
        <h2 className="text-xs font-semibold text-slate-800 sm:text-sm">
          {label(start)} – {label(end)} {end.slice(0, 4)}
        </h2>
        <div className="flex gap-1">
          <button type="button" aria-label="สัปดาห์ก่อนหน้า" onClick={() => setOffset(offset - 1)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 bg-white text-xs text-slate-500 hover:bg-slate-50">←</button>
          <button type="button" onClick={() => setOffset(0)} className="h-7 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">วันนี้</button>
          <button type="button" aria-label="สัปดาห์ถัดไป" onClick={() => setOffset(offset + 1)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 bg-white text-xs text-slate-500 hover:bg-slate-50">→</button>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-700 sm:grid-cols-7 sm:divide-x sm:divide-y-0">
        {dates.map((date) => {
          const dayTasks = scheduled.filter((task) => task.due_date === date);
          return (
            <div
              key={date}
              role="button"
              tabIndex={0}
              aria-label={`เพิ่มงานวันที่ ${weekdayLabel(date)} ${label(date)}`}
              onClick={() => setQuickAddDate(date)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setQuickAddDate(date);
                }
              }}
              className={`min-h-24 cursor-pointer p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${date === today ? "bg-indigo-50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50" : ""}`}
            >
              <p className={`mb-1.5 text-[11px] font-semibold ${date === today ? "text-indigo-700" : "text-slate-500"}`}>
                {weekdayLabel(date)}. {label(date)}
              </p>
              <ul className="space-y-1">
                {dayTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(task.id);
                      }}
                      className="flex w-full items-start gap-1.5 rounded-md bg-white px-1.5 py-1 text-left text-[11px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700"
                    >
                      <span aria-hidden title={PRIORITY_LABEL[task.priority]} className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PRIORITY_STYLE[task.priority]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{task.title}</span>
                        {task.notes && (
                          <span className="block truncate font-normal text-slate-400">{task.notes}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {selected && (
        <TaskDetailModal task={selected} today={today} members={members} onClose={() => setSelectedId(null)} />
      )}

      <NewTaskForm
        listId={listId}
        members={members}
        hideTrigger
        open={quickAddDate !== null}
        defaultDueDate={quickAddDate ?? undefined}
        onOpenChange={(open) => { if (!open) setQuickAddDate(null); }}
      />

      {unscheduled.length > 0 && (
        <details className="border-t border-slate-200 p-4">
          <summary className="cursor-pointer text-sm text-slate-600">ยังไม่กำหนดวัน ({unscheduled.length})</summary>
          <ul className="mt-3 space-y-2">{unscheduled.map((task) => <TaskItem key={task.id} task={task} today={today} members={members} />)}</ul>
        </details>
      )}
    </section>
  );
}
