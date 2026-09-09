import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/types";
import TaskItem from "@/components/TaskItem";

const { toggleTaskAction } = vi.hoisted(() => ({ toggleTaskAction: vi.fn() }));
vi.mock("@/app/actions", () => ({
  toggleTaskAction,
  editTask: vi.fn(),
  deleteTaskAction: vi.fn(),
  setStatusAction: vi.fn(),
}));
vi.mock("@/components/TaskDetailModal", () => ({
  default: ({ task, onClose }: { task: Task; onClose: () => void }) => (
    <div role="dialog" aria-label="รายละเอียดงาน">
      {task.title}
      <button type="button" onClick={onClose}>ปิด</button>
    </div>
  ),
}));

const task: Task = {
  id: "1",
  list_id: "list-1",
  title: "ทดสอบ",
  notes: null,
  status: "todo",
  priority: "medium",
  task_type: "task",
  start_date: null,
  due_date: null,
  assignee_id: null,
  tags: [],
  created_by: "u1",
  completed_at: null,
  created_at: "2026-09-08T00:00:00Z",
  updated_at: "2026-09-08T00:00:00Z",
};

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("TaskItem", () => {
  it("no longer shows the เริ่มทำ/แก้/ลบ action buttons on the card", () => {
    render(<ul><TaskItem task={task} today="2026-09-09" /></ul>);
    expect(screen.queryByRole("button", { name: "เริ่มทำ" })).toBeNull();
    expect(screen.queryByRole("button", { name: "แก้" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ลบ" })).toBeNull();
  });

  it("opens the task detail modal when the card is clicked", () => {
    render(<ul><TaskItem task={task} today="2026-09-09" /></ul>);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("ทดสอบ"));
    expect(screen.getByRole("dialog", { name: "รายละเอียดงาน" })).toBeTruthy();
  });

  it("closes the modal via its own onClose", () => {
    render(<ul><TaskItem task={task} today="2026-09-09" /></ul>);
    fireEvent.click(screen.getByText("ทดสอบ"));
    fireEvent.click(screen.getByRole("button", { name: "ปิด" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("toggling done does not open the modal and calls toggleTaskAction", () => {
    render(<ul><TaskItem task={task} today="2026-09-09" /></ul>);
    fireEvent.click(screen.getByRole("button", { name: "ทำเครื่องหมายว่าเสร็จ" }));
    expect(toggleTaskAction).toHaveBeenCalledWith("1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
