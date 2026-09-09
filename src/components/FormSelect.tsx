"use client";

import { useEffect, useRef, useState } from "react";

export type FormSelectOption = {
  value: string;
  label: string;
  color?: string;
};

export default function FormSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: FormSelectOption[];
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((option) => option.value === value) ?? options[0];

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

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="field flex items-center justify-between py-1.5 text-left text-xs"
      >
        <span className="flex items-center gap-2">
          {active.color && <span className={`h-2 w-2 rounded-full ${active.color}`} />}
          {active.label}
        </span>
        <svg viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div role="listbox" aria-label={label} className="absolute left-0 right-0 z-30 mt-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-600 dark:bg-slate-800">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                setValue(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${option.value === value ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
            >
              {option.color && <span className={`h-2 w-2 rounded-full ${option.color}`} />}
              {option.label}
              {option.value === value && <span className="ml-auto text-indigo-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
