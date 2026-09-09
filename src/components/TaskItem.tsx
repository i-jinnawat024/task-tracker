"use client";

import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import {
  deleteTaskAction,
  editTask,
  setStatusAction,
  toggleTaskAction,
  type ActionState,
} from "@/app/actions";
import { daysBetween, dueBucket } from "@/lib/tasks";
import { PRIORITIES, TASK_TYPES, type DueBucket, type ListMember, type Task } from "@/lib/types";

const BUCKET_STYLE: Record<DueBucket, string> = {
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
  today: "bg-amber-50 text-amber-700 border-amber-200",
  soon: "bg-sky-50 text-sky-700 border-sky-200",
  later: "bg-slate-50 text-slate-500 border-slate-200",
  none: "",
};

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-400",
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
  footer,
}: {
  task: Task;
  today: string;
  members?: ListMember[];
  /** แถบท้ายการ์ด ต่อท้ายในกรอบเดียวกัน (เช่น dropdown ย้ายสถานะของ Kanban) */
  footer?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pendingMutation, startMutation] = useTransition();
  const [state, formAction, saving] = useActionState<ActionState, FormData>(editTask, null);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  const bucket = dueBucket(task, today);
  const done = task.status === "done";
  const assignee = members.find((member) => member.user_id === task.assignee_id);

  if (editing) {
    return (
      <li className="card p-3">
        <form action={formAction} className="space-y-2.5">
          <input type="hidden" name="task_id" value={task.id} />

          <input name="title" defaultValue={task.title} required maxLength={200} className="field" />
          {state?.errors?.title && <p className="text-xs text-rose-600">{state.errors.title}</p>}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">ประเภท</span>
              <select name="task_type" defaultValue={task.task_type} className="field py-1.5 text-xs">
                {TASK_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABEL[type]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">สถานะ</span>
              <select name="status" defaultValue={task.status} className="field py-1.5 text-xs">
                <option value="todo">ที่ต้องทำ</option>
                <option value="doing">กำลังทำ</option>
                <option value="done">เสร็จแล้ว</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">ความสำคัญ</span>
              <select name="priority" defaultValue={task.priority} className="field py-1.5 text-xs">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">วันเริ่ม</span>
              <input type="date" name="start_date" defaultValue={task.start_date ?? ""} className="field py-1.5 text-xs" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">กำหนดเสร็จ</span>
              <input
                type="date"
                name="due_date"
                defaultValue={task.due_date ?? ""}
                className="field py-1.5 text-xs"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">ผู้รับผิดชอบ</span>
            <select name="assignee_id" defaultValue={task.assignee_id ?? ""} className="field py-1.5 text-xs">
              <option value="">ยังไม่ระบุ</option>
              {members.map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name ?? member.email ?? "สมาชิก"}</option>)}
            </select>
          </label>

          <input
            name="tags"
            defaultValue={task.tags.join(", ")}
            placeholder="แท็ก คั่นด้วย ,"
            className="field py-1.5 text-xs"
          />
          <textarea
            name="notes"
            defaultValue={task.notes ?? ""}
            rows={2}
            placeholder="รายละเอียด"
            className="field text-xs"
          />

          {state?.message && !state.ok && (
            <p className="text-xs text-rose-600">{state.message}</p>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary py-1.5 text-xs">
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-ghost py-1.5 text-xs"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className={`card relative transition ${
        pendingMutation ? "opacity-50" : ""
      } ${bucket === "overdue" ? "border-l-4 border-l-rose-400" : ""}`}
    >
      <div className="flex items-start gap-2.5 p-3 sm:gap-3">
        <button
          type="button"
          aria-label={done ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จ"}
          onClick={() => startMutation(() => void toggleTaskAction(task.id))}
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

        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex gap-0.5">
            {!done && task.status !== "doing" && (
              <button
                type="button"
                onClick={() => startMutation(() => void setStatusAction(task.id, "doing"))}
                className="btn-ghost border-0 px-1.5 py-1 text-[11px] text-slate-500 sm:px-2 sm:text-xs"
              >
                เริ่มทำ
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn-ghost border-0 px-1.5 py-1 text-[11px] text-slate-500 sm:px-2 sm:text-xs"
            >
              แก้
            </button>
          </div>

          {confirmingDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => startMutation(() => void deleteTaskAction(task.id))}
                className="btn-danger px-2 py-1 text-xs font-semibold"
              >
                ลบจริง
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="px-1 text-xs text-slate-400"
              >
                ไม่
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="btn-danger px-2 py-1 text-xs"
            >
              ลบ
            </button>
          )}
        </div>
      </div>

      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-1.5">{footer}</div>
      )}
    </li>
  );
}
