"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT_MARGIN_PX = 8;
const POPUP_GAP_PX = 6;

const DAY_NAMES = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseISO(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string) {
  return parseISO(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

export default function DateRangePicker({
  label,
  from,
  to,
  onChange,
}: {
  label: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const base = from ? parseISO(from) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!open) return;

    function reposition() {
      const trigger = triggerRef.current;
      const popup = popupRef.current;
      if (!trigger || !popup) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const popupWidth = popupRect.width;
      const popupHeight = popupRect.height;

      const left = Math.min(
        Math.max(triggerRect.left, VIEWPORT_MARGIN_PX),
        window.innerWidth - popupWidth - VIEWPORT_MARGIN_PX,
      );

      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const neededSpace = popupHeight + POPUP_GAP_PX + VIEWPORT_MARGIN_PX;
      const opensAbove = spaceBelow < neededSpace && spaceAbove > spaceBelow;
      const top = opensAbove
        ? triggerRect.top - popupHeight - POPUP_GAP_PX
        : triggerRect.bottom + POPUP_GAP_PX;

      setPopupPosition({ left, top });
    }

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
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

  // ยังไม่ครบคู่ (มี from แต่ยังไม่มี to) แปลว่ากำลังรอเลือกวันสิ้นสุด — คลิกครั้งถัดไปจึงปิด popup
  const selectingEnd = Boolean(from) && !to;

  function selectDate(iso: string) {
    if (selectingEnd) {
      if (iso < from) onChange(iso, from);
      else onChange(from, iso);
      setOpen(false);
    } else {
      onChange(iso, "");
    }
  }

  function clear() {
    onChange("", "");
    setOpen(false);
  }

  const placeholder = selectingEnd ? `${formatDate(from)} – เลือกวันสิ้นสุด` : "เลือกช่วงวันที่";
  const display = from && to ? `${formatDate(from)} – ${formatDate(to)}` : placeholder;

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`field flex items-center justify-between py-1.5 text-left text-xs ${from || to ? "text-slate-700" : "text-slate-400"}`}
      >
        <span className="truncate">{display}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M6.5 2.5v4M13.5 2.5v4M3 8h14" strokeLinecap="round" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={popupRef}
          role="dialog"
          aria-label={`ปฏิทิน ${label}`}
          // กัน pointerdown ทะลุไปโดน listener "คลิกข้างนอกให้ปิด" ของ container ที่ครอบอยู่ (เช่น FiltersPanel)
          // เพราะปฏิทินนี้ portal ออกไปที่ document.body จึงไม่ได้อยู่ใน DOM subtree ของ container นั้นแล้ว
          onPointerDown={(event) => event.stopPropagation()}
          style={{ left: popupPosition.left, top: popupPosition.top }}
          className="fixed z-[60] w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-800"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="เดือนก่อน" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">←</button>
            <span className="text-xs font-semibold text-slate-700">{month.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</span>
            <button type="button" aria-label="เดือนถัดไป" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">→</button>
          </div>
          <p className="mb-2 text-center text-[11px] text-slate-400">
            {selectingEnd ? "เลือกวันสิ้นสุด" : "เลือกวันเริ่มต้น"}
          </p>
          <div className="grid grid-cols-7 text-center text-[10px] text-slate-400">
            {DAY_NAMES.map((day) => <span key={day} className="py-1">{day}</span>)}
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const iso = toISO(month.getFullYear(), month.getMonth(), day);
              const isFrom = iso === from;
              const isTo = iso === to;
              const inRange = Boolean(from && to) && iso > from && iso < to;
              const endpoint = isFrom || isTo;
              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={iso}
                  onClick={() => selectDate(iso)}
                  className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs transition ${
                    endpoint
                      ? "bg-indigo-600 font-semibold text-white"
                      : inRange
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
                        : iso === todayISO
                          ? "bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
                          : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
            <button type="button" onClick={clear} className="text-[11px] text-slate-400 hover:text-rose-500">ล้าง</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
