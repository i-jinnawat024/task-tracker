export const TYPE_OPTIONS = [
  ["task", "งานทั่วไป"],
  ["feature", "ฟีเจอร์"],
  ["bug", "บั๊ก"],
  ["meeting", "ประชุม"],
] as const;

export const STATUS_OPTIONS = [
  { value: "todo", label: "ที่ต้องทำ", color: "bg-slate-400" },
  { value: "doing", label: "กำลังทำ", color: "bg-amber-400" },
  { value: "done", label: "เสร็จแล้ว", color: "bg-emerald-500" },
];

// สีต้องไม่ซ้ำกับสีสถานะใน STATUS_OPTIONS (doing=amber) ไม่งั้นแยกไม่ออกว่าหมายถึง
// priority "ปกติ" หรือสถานะ "กำลังทำ"
export const PRIORITY_OPTIONS = [
  { value: "low", label: "ไว้ก่อน", color: "bg-slate-300" },
  { value: "medium", label: "ปกติ", color: "bg-sky-400" },
  { value: "high", label: "สำคัญมาก", color: "bg-rose-500" },
];

export function TaskTypeIcon({ type }: { type: string }) {
  const common = "h-3.5 w-3.5";
  if (type === "feature") return <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="m10 2 1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2Z" strokeLinejoin="round" /><path d="m15.5 13 .6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z" strokeLinejoin="round" /></svg>;
  if (type === "bug") return <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="6" y="5" width="8" height="10" rx="4" /><path d="M8 5V3.5M12 5V3.5M4 8h2M14 8h2M4 12h2M14 12h2M8 9h4M10 9v6" strokeLinecap="round" /></svg>;
  if (type === "meeting") return <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="7" cy="7" r="2.5" /><circle cx="14" cy="8" r="2" /><path d="M2.5 16c.4-3 2-4.5 4.5-4.5s4.1 1.5 4.5 4.5M12 12c2.8-.5 4.6.8 5.2 3" strokeLinecap="round" /></svg>;
  return <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3.5" y="3" width="13" height="14" rx="2" /><path d="m6.5 10 2 2 5-5M7 5.8h5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
