import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Task } from "@/lib/types";
import WeekView from "@/components/WeekView";

vi.mock("@/components/TaskItem", () => ({
  default: ({ task, footer }: { task: Task; footer?: ReactNode }) => (
    <li>
      {task.title}
      {footer}
    </li>
  ),
}));
vi.mock("@/components/TaskDetailModal", () => ({
  default: ({ task, onClose }: { task: Task; onClose: () => void }) => (
    <div role="dialog" aria-label="รายละเอียดงาน">
      {task.title}
      <button type="button" onClick={onClose}>ปิด</button>
    </div>
  ),
}));
vi.mock("@/components/NewTaskForm", () => ({
  default: ({ open, defaultDueDate, onOpenChange }: { open?: boolean; defaultDueDate?: string; onOpenChange?: (open: boolean) => void }) =>
    open ? (
      <div role="dialog" aria-label="เพิ่มงานใหม่">
        กำหนดเสร็จ: {defaultDueDate}
        <button type="button" onClick={() => onOpenChange?.(false)}>ปิด</button>
      </div>
    ) : null,
}));

// 2026-09-08 คือวันอังคาร — สัปดาห์นั้นเริ่มวันจันทร์ 2026-09-07
const monday: Task = {
  id: "1", list_id: "list", title: "Design review", status: "todo", priority: "medium",
  task_type: "task", start_date: null, assignee_id: null,
  due_date: "2026-09-07", notes: null, tags: [], created_by: "user", completed_at: null,
  created_at: "2026-09-01T06:00:00Z", updated_at: "2026-09-01T06:00:00Z",
};
const undated: Task = { ...monday, id: "2", title: "Undated task", due_date: null };

afterEach(cleanup);

describe("WeekView", () => {
  it("groups tasks by day within the current week", () => {
    render(<WeekView tasks={[monday]} today="2026-09-08" listId="list-1" />);
    expect(screen.getByText("Design review")).toBeTruthy();
    expect(screen.getByText(/จันทร์/)).toBeTruthy();
  });

  it("navigates to next/previous week and back to today", () => {
    render(<WeekView tasks={[monday]} today="2026-09-08" listId="list-1" />);
    const initialHeading = screen.getByRole("heading").textContent;
    fireEvent.click(screen.getByRole("button", { name: "สัปดาห์ถัดไป" }));
    expect(screen.getByRole("heading").textContent).not.toBe(initialHeading);
    expect(screen.queryByText("Design review")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "วันนี้" }));
    expect(screen.getByRole("heading").textContent).toBe(initialHeading);
    expect(screen.getByText("Design review")).toBeTruthy();
  });

  it("lists tasks without a due date separately", () => {
    render(<WeekView tasks={[monday, undated]} today="2026-09-08" listId="list-1" />);
    expect(screen.getByText("ยังไม่กำหนดวัน (1)")).toBeTruthy();
  });

  it("shows a priority indicator on each task chip", () => {
    render(<WeekView tasks={[{ ...monday, priority: "high" }]} today="2026-09-08" listId="list-1" />);
    expect(screen.getByTitle("สำคัญมาก")).toBeTruthy();
  });

  it("shows the task description under its title when present", () => {
    render(<WeekView tasks={[{ ...monday, notes: "รอทีม design ส่ง mockup ก่อน" }]} today="2026-09-08" listId="list-1" />);
    expect(screen.getByText("รอทีม design ส่ง mockup ก่อน")).toBeTruthy();
  });

  it("opens the full task detail modal when a task chip is clicked", () => {
    render(<WeekView tasks={[monday]} today="2026-09-08" listId="list-1" />);
    fireEvent.click(screen.getByRole("button", { name: /Design review/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Design review");
    fireEvent.click(screen.getByRole("button", { name: "ปิด" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a new task pre-filled with that day's date when the day column's empty space is clicked", () => {
    render(<WeekView tasks={[]} today="2026-09-08" listId="list-1" />);
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มงานวันที่ จันทร์ 7 ก.ย." }));

    const dialog = screen.getByRole("dialog", { name: "เพิ่มงานใหม่" });
    expect(dialog.textContent).toContain("2026-09-07");

    fireEvent.click(screen.getByRole("button", { name: "ปิด" }));
    expect(screen.queryByRole("dialog", { name: "เพิ่มงานใหม่" })).toBeNull();
  });

  it("does not open the quick-add dialog when clicking an existing task in the column", () => {
    render(<WeekView tasks={[monday]} today="2026-09-08" listId="list-1" />);
    fireEvent.click(screen.getByRole("button", { name: /Design review/ }));
    expect(screen.queryByRole("dialog", { name: "เพิ่มงานใหม่" })).toBeNull();
  });
});
