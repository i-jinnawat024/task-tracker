"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTask, type ActionState } from "@/app/actions";
import type { ListMember } from "@/lib/types";
import DatePicker from "./DatePicker";
import FormSelect from "./FormSelect";
import Modal from "./Modal";
import TagInput from "./TagInput";

const TYPE_OPTIONS = [
  ["task", "งานทั่วไป"],
  ["feature", "ฟีเจอร์"],
  ["bug", "บั๊ก"],
  ["meeting", "ประชุม"],
] as const;

const STATUS_OPTIONS = [
  { value: "todo", label: "ที่ต้องทำ", color: "bg-slate-400" },
  { value: "doing", label: "กำลังทำ", color: "bg-amber-400" },
  { value: "done", label: "เสร็จแล้ว", color: "bg-emerald-500" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "ไว้ก่อน", color: "bg-slate-300" },
  { value: "medium", label: "ปกติ", color: "bg-amber-400" },
  { value: "high", label: "สำคัญมาก", color: "bg-rose-500" },
];

function TaskTypeIcon({ type }: { type: string }) {
  const common = "h-3.5 w-3.5";
  if (type === "feature") return <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="m10 2 1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2Z" strokeLinejoin="round" /><path d="m15.5 13 .6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z" strokeLinejoin="round" /></svg>;
  if (type === "bug") return <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="6" y="5" width="8" height="10" rx="4" /><path d="M8 5V3.5M12 5V3.5M4 8h2M14 8h2M4 12h2M14 12h2M8 9h4M10 9v6" strokeLinecap="round" /></svg>;
  if (type === "meeting") return <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="7" cy="7" r="2.5" /><circle cx="14" cy="8" r="2" /><path d="M2.5 16c.4-3 2-4.5 4.5-4.5s4.1 1.5 4.5 4.5M12 12c2.8-.5 4.6.8 5.2 3" strokeLinecap="round" /></svg>;
  return <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3.5" y="3" width="13" height="14" rx="2" /><path d="m6.5 10 2 2 5-5M7 5.8h5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function NewTaskForm({ listId, members = [] }: { listId: string; members?: ListMember[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addTask, null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // เพิ่มสำเร็จแล้วล้างฟอร์ม + ปิด modal เพื่อพิมพ์งานถัดไปได้ทันที
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary px-3 py-1.5 text-xs shadow-sm"
      >
        <span aria-hidden className="text-base leading-none">
          +
        </span>
        เพิ่มงาน
      </button>

      {open && (
        <Modal title="เพิ่มงานใหม่" onClose={() => setOpen(false)}>
          <form ref={formRef} action={formAction} className="space-y-3">
            <input type="hidden" name="list_id" value={listId} />

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">ชื่องาน</span>
              <input
                name="title"
                required
                maxLength={200}
                autoFocus
                placeholder="เช่น ซื้อของเข้าบ้าน"
                className="field"
              />
              {state?.errors?.title && (
                <p className="mt-1 text-xs text-rose-600">{state.errors.title}</p>
              )}
            </label>

            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-slate-600">ประเภทงาน</legend>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {TYPE_OPTIONS.map(([value, label]) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" name="task_type" value={value} defaultChecked={value === "task"} className="peer sr-only" />
                    <span className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-500 transition peer-checked:border-indigo-300 peer-checked:bg-indigo-50 peer-checked:font-medium peer-checked:text-indigo-700">
                      <TaskTypeIcon type={value} />{label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DatePicker name="start_date" label="วันเริ่ม" />
              <DatePicker name="due_date" label="กำหนดเสร็จ" />
            </div>
            {state?.errors?.start_date && <p className="text-xs text-rose-600">{state.errors.start_date}</p>}
            {state?.errors?.due_date && (
              <p className="text-xs text-rose-600">{state.errors.due_date}</p>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <FormSelect name="status" label="สถานะเริ่มต้น" defaultValue="todo" options={STATUS_OPTIONS} />
              <FormSelect name="priority" label="ความสำคัญ" defaultValue="medium" options={PRIORITY_OPTIONS} />
            </div>

            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-slate-600">ผู้รับผิดชอบ</legend>
              <div className="flex flex-wrap gap-1.5">
                <label className="cursor-pointer">
                  <input type="radio" name="assignee_id" value="" defaultChecked className="peer sr-only" />
                  <span className="block rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 peer-checked:border-indigo-300 peer-checked:bg-indigo-50 peer-checked:text-indigo-700">ยังไม่ระบุ</span>
                </label>
                {members.map((member) => (
                  <label key={member.user_id} className="cursor-pointer">
                    <input type="radio" name="assignee_id" value={member.user_id} className="peer sr-only" />
                    <span className="block rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 peer-checked:border-indigo-300 peer-checked:bg-indigo-50 peer-checked:text-indigo-700">
                      {member.display_name ?? member.email ?? "สมาชิก"}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <TagInput />

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">รายละเอียด</span>
              <textarea name="notes" rows={3} className="field text-xs" />
            </label>

            {state?.message && !state.ok && (
              <p className="text-xs text-rose-600">{state.message}</p>
            )}

            <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-slate-100 bg-white/95 px-4 pb-0 pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-1 dark:bg-slate-900/95 sm:dark:bg-transparent">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                ยกเลิก
              </button>
              <button type="submit" disabled={pending} className="btn-primary">
                {pending ? "กำลังเพิ่ม…" : "เพิ่ม"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
