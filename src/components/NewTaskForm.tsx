"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTask, type ActionState } from "@/app/actions";
import type { ListMember } from "@/lib/types";
import DatePicker from "./DatePicker";
import FormSelect from "./FormSelect";
import Modal from "./Modal";
import TagInput from "./TagInput";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, TaskTypeIcon, TYPE_OPTIONS } from "./taskFormOptions";

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
