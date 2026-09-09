"use client";

import { useEffect, useRef, useState } from "react";
import type { Status } from "@/lib/types";

const OPTIONS: { value: Status; label: string; dot: string }[] = [
  { value: "todo", label: "ที่ต้องทำ", dot: "bg-slate-400" },
  { value: "doing", label: "กำลังทำ", dot: "bg-amber-400" },
  { value: "done", label: "เสร็จแล้ว", dot: "bg-emerald-500" },
];

export default function StatusPicker({
  value,
  label,
  disabled,
  onChange,
}: {
  value: Status;
  label: string;
  disabled?: boolean;
  onChange: (value: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = OPTIONS.find((option) => option.value === value)!;

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-w-28 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
      >
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${active.dot}`} />
          {active.label}
        </span>
        <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} fill="none" aria-hidden>
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div role="listbox" aria-label={label} className="absolute bottom-full right-0 z-30 mb-1.5 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                option.value === value
                  ? "bg-indigo-50 font-semibold text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${option.dot}`} />
              {option.label}
              {option.value === value && <span className="ml-auto text-indigo-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
