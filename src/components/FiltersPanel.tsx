"use client";

import { useEffect, useRef } from "react";
import type { Status } from "@/lib/types";
import DatePicker from "./DatePicker";

const STATUS_TABS: { value: Status | "open" | "all"; label: string }[] = [
  { value: "open", label: "ที่ต้องทำ" },
  { value: "doing", label: "กำลังทำ" },
  { value: "done", label: "เสร็จแล้ว" },
  { value: "all", label: "ทั้งหมด" },
];

export default function FiltersPanel({
  status,
  onStatusChange,
  overdueOnly,
  onOverdueOnlyChange,
  dueFrom,
  onDueFromChange,
  dueTo,
  onDueToChange,
  onClear,
  onClose,
}: {
  status: Status | "open" | "all";
  onStatusChange: (value: Status | "open" | "all") => void;
  overdueOnly: boolean;
  onOverdueOnlyChange: (value: boolean) => void;
  dueFrom: string;
  onDueFromChange: (value: string) => void;
  dueTo: string;
  onDueToChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // ปิดเมื่อคลิกข้างนอกหรือกด Escape — เหมือน pattern ของ ListSwitcher/DatePicker
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="ตัวกรอง"
      className="absolute right-0 z-20 mt-2 w-full min-w-[280px] rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-lg sm:w-80 dark:border-slate-600 dark:bg-slate-800"
    >
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-slate-600">สถานะ</legend>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={status === tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                status === tab.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={overdueOnly}
          onChange={(event) => onOverdueOnlyChange(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
        />
        เฉพาะที่เลยกำหนด
      </label>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-slate-600">กำหนดเสร็จ (ช่วง)</p>
        <div className="grid grid-cols-2 gap-2">
          <DatePicker label="ตั้งแต่วันที่" value={dueFrom} onChange={onDueFromChange} />
          <DatePicker label="ถึงวันที่" value={dueTo} onChange={onDueToChange} />
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
        <button type="button" onClick={onClear} className="text-xs text-slate-400 hover:text-rose-500">
          ล้างตัวกรอง
        </button>
        <button type="button" onClick={onClose} className="btn-ghost py-1.5 text-xs">
          เสร็จสิ้น
        </button>
      </div>
    </div>
  );
}
