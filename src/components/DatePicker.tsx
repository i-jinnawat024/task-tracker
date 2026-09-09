"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DAY_NAMES = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseISO(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string) {
  if (!value) return "เลือกวันที่";
  return parseISO(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

export default function DatePicker({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  const initial = defaultValue ? parseISO(defaultValue) : new Date();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const total = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - leading + 1;
      return day >= 1 && day <= total ? day : null;
    });
  }, [month]);

  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input type="hidden" name={name} value={value} />
      <button type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`field flex items-center justify-between py-1.5 text-left text-xs ${value ? "text-slate-700" : "text-slate-400"}`}>
        <span>{formatDate(value)}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M6.5 2.5v4M13.5 2.5v4M3 8h14" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div role="dialog" aria-label={`ปฏิทิน ${label}`} className="absolute left-0 z-40 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="เดือนก่อน" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">←</button>
            <span className="text-xs font-semibold text-slate-700">{month.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</span>
            <button type="button" aria-label="เดือนถัดไป" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">→</button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] text-slate-400">
            {DAY_NAMES.map((day) => <span key={day} className="py-1">{day}</span>)}
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const iso = toISO(month.getFullYear(), month.getMonth(), day);
              return <button key={iso} type="button" aria-label={iso} onClick={() => { setValue(iso); setOpen(false); }} className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs transition ${value === iso ? "bg-indigo-600 font-semibold text-white" : iso === todayISO ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>{day}</button>;
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
            <button type="button" onClick={() => { setValue(""); setOpen(false); }} className="text-[11px] text-slate-400 hover:text-rose-500">ล้าง</button>
            <button type="button" onClick={() => { setValue(todayISO); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setOpen(false); }} className="text-[11px] font-medium text-indigo-600">วันนี้</button>
          </div>
        </div>
      )}
    </div>
  );
}
