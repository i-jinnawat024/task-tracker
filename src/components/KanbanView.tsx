"use client";

import { useState, useTransition } from "react";
import { setStatusAction } from "@/app/actions";
import type { ListMember, Status, Task } from "@/lib/types";
import TaskItem from "./TaskItem";
import StatusPicker from "./StatusPicker";

const columns: { status: Status; label: string; color: string }[] = [
  { status: "todo", label: "ที่ต้องทำ", color: "bg-slate-400" },
  { status: "doing", label: "กำลังทำ", color: "bg-amber-400" },
  { status: "done", label: "เสร็จแล้ว", color: "bg-emerald-500" },
];

export default function KanbanView({ tasks, today, members = [] }: { tasks: Task[]; today: string; members?: ListMember[] }) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(id: string, status: Status) {
    if (pending || tasks.find((task) => task.id === id)?.status === status) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await setStatusAction(id, status);
        if (!result?.ok) setError(result?.message ?? "ย้ายงานไม่สำเร็จ ลองอีกครั้งนะ");
      } catch {
        setError("เชื่อมต่อไม่สำเร็จ ลองอีกครั้งนะ");
      }
    });
  }

  return <section aria-label="Kanban" aria-busy={pending}>
    <p className="mb-3 text-xs text-slate-500">ลากการ์ดข้ามคอลัมน์ หรือเลือกสถานะใต้การ์ดเพื่อย้ายงาน</p>
    {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map((column) => {
        const items = tasks.filter((task) => task.status === column.status);
        return <section key={column.status}
          onDragOver={(event) => { if (dragged && !pending) { event.preventDefault(); setOver(column.status); } }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null); }}
          onDrop={(event) => { event.preventDefault(); if (dragged) move(dragged, column.status); setDragged(null); setOver(null); }}
          className={`min-w-0 rounded-2xl border p-3 transition ${over === column.status ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-100/70'}`}>
          <h2 className="mb-4 flex items-center gap-2 px-1 text-sm font-semibold text-slate-700">
            <span className={`h-2.5 w-2.5 rounded-full ${column.color}`} />{column.label}
            <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{items.length}</span>
          </h2>
          <ul className="min-h-32 space-y-3">
            {items.map((task) => <div key={task.id} draggable={!pending}
              onDragStart={(event) => { event.dataTransfer.setData('text/plain', task.id); event.dataTransfer.effectAllowed = 'move'; setDragged(task.id); }}
              onDragEnd={() => { setDragged(null); setOver(null); }}
              className={dragged === task.id ? 'opacity-50' : ''}>
              <TaskItem
                task={task}
                today={today}
                members={members}
                footer={
                  <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
                    <span>ย้ายไป</span>
                    <StatusPicker
                      label={`สถานะ ${task.title}`}
                      value={task.status}
                      disabled={pending}
                      onChange={(status) => move(task.id, status)}
                    />
                  </div>
                }
              />
            </div>)}
            {!items.length && <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-xs text-slate-400">ยังไม่มีงานในสถานะนี้</p>}
          </ul>
        </section>;
      })}
    </div>
  </section>;
}
