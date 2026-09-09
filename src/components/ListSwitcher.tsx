"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskList } from "@/lib/types";

export default function ListSwitcher({
  lists,
  activeId,
  onSelect,
}: {
  lists: TaskList[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = lists.find((l) => l.id === activeId) ?? lists[0];

  // ปิดเมนูเมื่อคลิกข้างนอกหรือกด Escape — เหมือน native <select> ที่ของเดิมมาแทน
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex w-auto items-center gap-2 rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs text-slate-700 outline-none transition hover:border-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      >
        {active.name}
      </button>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      >
        <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-10 mt-1.5 min-w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-xs shadow-lg"
        >
          {lists.map((l) => (
            <li
              key={l.id}
              role="option"
              aria-selected={l.id === activeId}
              onClick={() => {
                onSelect(l.id);
                setOpen(false);
              }}
              className={`cursor-pointer whitespace-nowrap px-3 py-2 transition hover:bg-slate-50 ${
                l.id === activeId ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-700"
              }`}
            >
              {l.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
