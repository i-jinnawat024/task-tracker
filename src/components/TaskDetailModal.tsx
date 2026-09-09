"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteTaskAction, editTask, type ActionState } from "@/app/actions";
import type { ListMember, Task } from "@/lib/types";
import DatePicker from "./DatePicker";
import FormSelect from "./FormSelect";
import Modal from "./Modal";
import TagInput from "./TagInput";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, TaskTypeIcon, TYPE_OPTIONS } from "./taskFormOptions";

export default function TaskDetailModal({
  task,
  members,
  onClose,
}: {
  task: Task;
  today: string;
  members: ListMember[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(editTask, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  // บันทึกสำเร็จแล้วปิด modal ทันที เหมือน NewTaskForm
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  function confirmDelete() {
    startDelete(async () => {
      const result = await deleteTaskAction(task.id);
      if (result?.ok) onClose();
    });
  }

  return (
    <Modal title="รายละเอียดงาน" onClose={onClose}>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="task_id" value={task.id} />

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">ชื่องาน</span>
          <input
            name="title"
            defaultValue={task.title}
            required
            maxLength={200}
            autoFocus
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
                <input type="radio" name="task_type" value={value} defaultChecked={value === task.task_type} className="peer sr-only" />
                <span className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-500 transition peer-checked:border-indigo-300 peer-checked:bg-indigo-50 peer-checked:font-medium peer-checked:text-indigo-700">
                  <TaskTypeIcon type={value} />{label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <DatePicker name="start_date" label="วันเริ่ม" defaultValue={task.start_date ?? ""} />
          <DatePicker name="due_date" label="กำหนดเสร็จ" defaultValue={task.due_date ?? ""} />
        </div>
        {state?.errors?.start_date && <p className="text-xs text-rose-600">{state.errors.start_date}</p>}
        {state?.errors?.due_date && <p className="text-xs text-rose-600">{state.errors.due_date}</p>}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          <FormSelect name="status" label="สถานะ" defaultValue={task.status} options={STATUS_OPTIONS} />
          <FormSelect name="priority" label="ความสำคัญ" defaultValue={task.priority} options={PRIORITY_OPTIONS} />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-slate-600">ผู้รับผิดชอบ</legend>
          <div className="flex flex-wrap gap-1.5">
            <label className="cursor-pointer">
              <input type="radio" name="assignee_id" value="" defaultChecked={!task.assignee_id} className="peer sr-only" />
              <span className="block rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 peer-checked:border-indigo-300 peer-checked:bg-indigo-50 peer-checked:text-indigo-700">ยังไม่ระบุ</span>
            </label>
            {members.map((member) => (
              <label key={member.user_id} className="cursor-pointer">
                <input type="radio" name="assignee_id" value={member.user_id} defaultChecked={member.user_id === task.assignee_id} className="peer sr-only" />
                <span className="block rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 peer-checked:border-indigo-300 peer-checked:bg-indigo-50 peer-checked:text-indigo-700">
                  {member.display_name ?? member.email ?? "สมาชิก"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <TagInput defaultTags={task.tags} />

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">รายละเอียด</span>
          <textarea name="notes" defaultValue={task.notes ?? ""} rows={3} className="field text-xs" />
        </label>

        {state?.message && !state.ok && (
          <p className="text-xs text-rose-600">{state.message}</p>
        )}

        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-2 border-t border-slate-100 bg-white/95 px-4 pb-0 pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-1 dark:bg-slate-900/95 sm:dark:bg-transparent">
          {confirmingDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">ลบงานนี้แน่นอนไหม?</span>
              <button type="button" disabled={deleting} onClick={confirmDelete} className="btn-danger px-2 py-1 text-xs font-semibold">
                {deleting ? "กำลังลบ…" : "ลบจริง"}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className="px-1 text-xs text-slate-400">
                ไม่
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} className="btn-danger px-2 py-1 text-xs">
              ลบงานนี้
            </button>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              ยกเลิก
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
