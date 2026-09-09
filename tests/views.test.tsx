import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/types";
import KanbanView from "@/components/KanbanView";
import GanttView from "@/components/GanttView";

const { setStatusAction } = vi.hoisted(() => ({ setStatusAction: vi.fn() }));
vi.mock("@/app/actions", () => ({ setStatusAction }));
vi.mock("@/components/TaskItem", () => ({
  default: ({ task }: { task: Task }) => <li>{task.title}</li>,
}));
const task: Task = {
  id: "1", list_id: "list", title: "Design review", status: "todo", priority: "medium",
  task_type: "task", start_date: null, assignee_id: null,
  due_date: "2026-09-12", notes: null, tags: [], created_by: "user", completed_at: null,
  created_at: "2026-09-08T06:00:00Z", updated_at: "2026-09-08T06:00:00Z",
};
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); });

describe("task views", () => {
  it("moves a Kanban card via drag and drop and shows server failures", async () => {
    setStatusAction.mockResolvedValue({ ok: false, message: "ไม่มีสิทธิ์" });
    render(<KanbanView tasks={[task]} today="2026-09-08" />);

    const card = screen.getByText("Design review").closest("[draggable]") as HTMLElement;
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.dragStart(card, { dataTransfer });

    const doingColumn = screen.getByText("กำลังทำ").closest("section") as HTMLElement;
    fireEvent.dragOver(doingColumn, { dataTransfer });
    fireEvent.drop(doingColumn, { dataTransfer });

    await waitFor(() => expect(setStatusAction).toHaveBeenCalledWith("1", "doing"));
    expect((await screen.findByRole("alert")).textContent).toContain("ไม่มีสิทธิ์");
  });

  it("opens task details from the Gantt bar and navigates back to today", () => {
    render(<GanttView tasks={[task]} today="2026-09-08" />);
    fireEvent.click(screen.getByRole("button", { name: /Design review:/ }));
    expect(screen.getByRole("heading", { name: "รายละเอียดงาน" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "ถัดไป 2 สัปดาห์" }));
    expect(screen.getByRole("button", { name: /อยู่นอกช่วง/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "วันนี้" }));
    expect(screen.getByRole("button", { name: /Design review:/ })).toBeTruthy();
  });

  it("keeps undated tasks available and renders backdated deadlines as a marker", () => {
    render(<GanttView tasks={[{ ...task, due_date: "2026-09-06" }, { ...task, id: "2", title: "Undated", due_date: null }]} today="2026-09-08" />);
    const bar = screen.getByRole("button", { name: /Design review:/ });
    expect(parseFloat(bar.style.width)).toBeCloseTo(100 / 14);
    expect(screen.getByText("ยังไม่กำหนดวัน (1)")).toBeTruthy();
  });
});
