"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTask, type ActionState } from "@/app/actions";
import type { ListMember } from "@/lib/types";
import Modal from "./Modal";

const TYPE_OPTIONS = [
  ["task", "✓", "งานทั่วไป"],
  ["feature", "✦", "ฟีเจอร์"],
  ["bug", "!", "บั๊ก"],
  ["meeting", "○", "ประชุม"],
] as const;

const STATUS_OPTIONS = [
  ["todo", "ที่ต้องทำ"],
  ["doing", "กำลังทำ"],
  ["done", "เสร็จแล้ว"],
] as const;

const PRIORITY_OPTIONS = [
  ["low", "ไว้ก่อน", "bg-slate-300"],
  ["medium", "ปกติ", "bg-amber-400"],
  ["high", "สำคัญมาก", "bg-rose-500"],
] as const;

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
              <div className="grid grid-cols-4 gap-1.5">
                {TYPE_OPTIONS.map(([value, icon, label]) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" name="task_type" value={value} defaultChecked={value === "task"} className="peer sr-only" />
                    <span className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-500 transition peer-checked:border-indigo-300 peer-checked:bg-indigo-50 peer-checked:font-medium peer-checked:text-indigo-700">
                      <span aria-hidden>{icon}</span>{label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">วันเริ่ม</span>
                <input type="date" name="start_date" className="field py-1.5 text-xs" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">กำหนดเสร็จ</span>
                <input type="date" name="due_date" className="field py-1.5 text-xs" />
              </label>
            </div>
            {state?.errors?.start_date && <p className="text-xs text-rose-600">{state.errors.start_date}</p>}
            {state?.errors?.due_date && (
              <p className="text-xs text-rose-600">{state.errors.due_date}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <fieldset>
                <legend className="mb-1.5 text-xs font-medium text-slate-600">สถานะเริ่มต้น</legend>
                <div className="flex rounded-lg bg-slate-100 p-1">
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <label key={value} className="min-w-0 flex-1 cursor-pointer">
                      <input type="radio" name="status" value={value} defaultChecked={value === "todo"} className="peer sr-only" />
                      <span className="block truncate rounded-md px-1.5 py-1.5 text-center text-[11px] text-slate-500 peer-checked:bg-white peer-checked:font-medium peer-checked:text-slate-800 peer-checked:shadow-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-xs font-medium text-slate-600">ความสำคัญ</legend>
                <div className="flex rounded-lg bg-slate-100 p-1">
                  {PRIORITY_OPTIONS.map(([value, label, dot]) => (
                    <label key={value} className="min-w-0 flex-1 cursor-pointer">
                      <input type="radio" name="priority" value={value} defaultChecked={value === "medium"} className="peer sr-only" />
                      <span className="flex items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] text-slate-500 peer-checked:bg-white peer-checked:font-medium peer-checked:text-slate-800 peer-checked:shadow-sm"><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
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

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                แท็ก (คั่นด้วย , ได้ไม่เกิน 5 อัน)
              </span>
              <input name="tags" placeholder="บ้าน, งาน, ซื้อของ" className="field py-1.5 text-xs" />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">รายละเอียด</span>
              <textarea name="notes" rows={3} className="field text-xs" />
            </label>

            {state?.message && !state.ok && (
              <p className="text-xs text-rose-600">{state.message}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
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
