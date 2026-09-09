"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { toggleTaskAction } from "@/app/actions";
import { daysBetween, dueBucket } from "@/lib/tasks";
import type { DueBucket, ListMember, Task } from "@/lib/types";
import TaskDetailModal from "./TaskDetailModal";

const BUCKET_STYLE: Record<DueBucket, string> = {
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
  today: "bg-amber-50 text-amber-700 border-amber-200",
  soon: "bg-sky-50 text-sky-700 border-sky-200",
  later: "bg-slate-50 text-slate-500 border-slate-200",
  none: "",
};

// สีต้องไม่ซ้ำกับสีสถานะ (todo=slate, doing=amber, done=emerald) ไม่งั้นจุด priority
// กับ chip "กำลังทำ" จะดูเป็นความหมายเดียวกันจนแยกไม่ออก
const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-rose-500",
  medium: "bg-sky-400",
  low: "bg-slate-300",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "สำคัญมาก",
  medium: "ปกติ",
  low: "ไว้ก่อน",
};

const TYPE_LABEL: Record<string, string> = {
  task: "งาน",
  feature: "ฟีเจอร์",
  bug: "บั๊ก",
  meeting: "ประชุม",
};

function dueLabel(task: Task, today: string): string {
  if (!task.due_date) return "";
  const diff = daysBetween(today, task.due_date);
  if (diff === 0) return "ครบกำหนดวันนี้";
  if (diff === 1) return "ครบกำหนดพรุ่งนี้";
  if (diff === -1) return "เลยกำหนด 1 วัน";
  if (diff < 0) return `เลยกำหนด ${-diff} วัน`;
  if (diff <= 7) return `อีก ${diff} วัน`;
  return new Date(`${task.due_date}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default function TaskItem({
  task,
  today,
  members = [],
}: {
  task: Task;
  today: string;
  members?: ListMember[];
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingMutation, startMutation] = useTransition();

  const bucket = dueBucket(task, today);
  const done = task.status === "done";
  const assignee = members.find((member) => member.user_id === task.assignee_id);

  function onCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setDetailOpen(true);
    }
  }

  return (
    <li
      className={`card relative transition ${
        pendingMutation ? "opacity-50" : ""
      } ${bucket === "overdue" ? "border-l-4 border-l-rose-400" : ""}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={onCardKeyDown}
        className="flex cursor-pointer items-start gap-2.5 rounded-xl p-3 transition hover:bg-slate-50 sm:gap-3 dark:hover:bg-slate-800/60"
      >
        <button
          type="button"
          aria-label={done ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จ"}
          onClick={(event) => {
            event.stopPropagation();
            startMutation(() => void toggleTaskAction(task.id));
          }}
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 hover:border-emerald-400"
          }`}
        >
          {done && (
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden>
              <path d="M7.6 13.4 4.2 10l1.2-1.2 2.2 2.2 5-5L13.8 7z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span
              aria-hidden
              title={PRIORITY_LABEL[task.priority]}
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_STYLE[task.priority]}`}
            />
            <p
              className={`break-words text-sm ${
                done ? "text-slate-400 line-through" : "font-medium text-slate-800"
              }`}
            >
              {task.title}
            </p>
          </div>

          {task.notes && (
            <p className="mt-1 whitespace-pre-wrap break-words pl-4 text-xs text-slate-500">
              {task.notes}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-0 sm:gap-1.5 sm:pl-4">
            {task.task_type !== "task" && (
              <span className="chip border-indigo-100 bg-indigo-50 text-indigo-600">{TYPE_LABEL[task.task_type]}</span>
            )}
            {task.status === "doing" && (
              <span className="chip border-amber-200 bg-amber-50 text-amber-700">กำลังทำ</span>
            )}
            {task.due_date && (
              <span className={`chip ${BUCKET_STYLE[bucket]}`}>{dueLabel(task, today)}</span>
            )}
            {task.tags.map((tag) => (
              <span key={tag} className="chip">
                #{tag}
              </span>
            ))}
            {assignee && (
              <span className="chip border-violet-100 bg-violet-50 text-violet-600">
                @{assignee.display_name ?? assignee.email ?? "สมาชิก"}
              </span>
            )}
          </div>
        </div>
      </div>

      {detailOpen && (
        <TaskDetailModal
          task={task}
          today={today}
          members={members}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </li>
  );
}
