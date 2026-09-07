"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTask, type ActionState } from "@/app/actions";
import { PRIORITIES } from "@/lib/types";

const PRIORITY_LABEL: Record<string, string> = {
  high: "สำคัญมาก",
  medium: "ปกติ",
  low: "ไว้ก่อน",
};

export default function NewTaskForm({ listId }: { listId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addTask, null);
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // เพิ่มสำเร็จแล้วล้างฟอร์ม + พับรายละเอียดกลับ เพื่อพิมพ์งานถัดไปได้ทันที
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setExpanded(false);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="card p-3">
      <input type="hidden" name="list_id" value={listId} />

      <div className="flex gap-2">
        <input
          name="title"
          required
          maxLength={200}
          placeholder="เพิ่มงานใหม่…"
          className="field flex-1"
          onFocus={() => setExpanded(true)}
        />
        <button type="submit" disabled={pending} className="btn-primary shrink-0">
          {pending ? "…" : "เพิ่ม"}
        </button>
      </div>

      {state?.errors?.title && (
        <p className="mt-1.5 text-xs text-rose-600">{state.errors.title}</p>
      )}
      {state?.message && !state.ok && (
        <p className="mt-1.5 text-xs text-rose-600">{state.message}</p>
      )}

      {expanded && (
        <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">กำหนดเสร็จ</span>
              {/* ไม่ใส่ min={today} เพราะจดงานที่เลยกำหนดไปแล้วเป็นเคสจริง
                  (นึกขึ้นได้ทีหลังว่าลืมทำ) — logic ฝั่ง server รับวันในอดีตอยู่แล้ว */}
              <input type="date" name="due_date" className="field py-1.5 text-xs" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">ความสำคัญ</span>
              <select name="priority" defaultValue="medium" className="field py-1.5 text-xs">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              แท็ก (คั่นด้วย , ได้ไม่เกิน 5 อัน)
            </span>
            <input name="tags" placeholder="บ้าน, งาน, ซื้อของ" className="field py-1.5 text-xs" />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">รายละเอียด</span>
            <textarea name="notes" rows={2} className="field text-xs" />
          </label>

          {state?.errors?.due_date && (
            <p className="text-xs text-rose-600">{state.errors.due_date}</p>
          )}
        </div>
      )}
    </form>
  );
}
