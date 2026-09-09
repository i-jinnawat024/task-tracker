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
  if (!value) return "เลือกวันที่";
  return parseISO(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

export default function DatePicker({ name, label, defaultValue = "", value: controlledValue, onChange }: { name?: string; label: string; defaultValue?: string; value?: string; onChange?: (value: string) => void }) {
  const initialValue = controlledValue ?? defaultValue;
  const initial = initialValue ? parseISO(initialValue) : new Date();
  const [internalValue, setInternalValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState({ left: 0, top: 0 });

  // ปฏิทิน portal ออกไปที่ document.body แล้ววางด้วย position:fixed พิกัดจริงของจอ (ไม่ใช่ absolute
  // ใต้ปุ่ม) เพราะถ้าปุ่มอยู่ใน modal ที่มี overflow-y-auto (ซึ่งทำให้ overflow-x กลายเป็น auto ไปด้วย
  // ตาม spec) ปฏิทินแบบ absolute เดิมจะโดน modal ครอบ/ตัด กลายเป็นต้อง scroll ข้างในโมดัลไปหาแทน
  // การ portal ออกจาก DOM ของ modal ทำให้ปฏิทินไม่ถูก container ไหนบังคับ scroll/clip อีก
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
      // ปฏิทิน portal ออกไปอยู่นอก rootRef แล้ว ต้องเช็คแยกว่าคลิกโดนปฏิทินเองไหมด้วย
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
  const value = controlledValue ?? internalValue;
  const selectValue = (next: string) => {
    setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {name && <input type="hidden" name={name} value={value} />}
      <button ref={triggerRef} type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`field flex items-center justify-between py-1.5 text-left text-xs ${value ? "text-slate-700" : "text-slate-400"}`}>
        <span>{formatDate(value)}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M6.5 2.5v4M13.5 2.5v4M3 8h14" strokeLinecap="round" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={popupRef}
          role="dialog"
          aria-label={`ปฏิทิน ${label}`}
          style={{ left: popupPosition.left, top: popupPosition.top }}
          className="fixed z-[60] w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-800"
        >
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
              return <button key={iso} type="button" aria-label={iso} onClick={() => selectValue(iso)} className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs transition ${value === iso ? "bg-indigo-600 font-semibold text-white" : iso === todayISO ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>{day}</button>;
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
            <button type="button" onClick={() => selectValue("")} className="text-[11px] text-slate-400 hover:text-rose-500">ล้าง</button>
            <button type="button" onClick={() => { selectValue(todayISO); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }} className="text-[11px] font-medium text-indigo-600">วันนี้</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
