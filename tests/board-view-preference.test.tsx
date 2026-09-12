import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/auth";
import type { Task, TaskList } from "@/lib/types";
import Board from "@/components/Board";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/components/ListSwitcher", () => ({ default: () => null }));
vi.mock("@/components/NewTaskForm", () => ({ default: () => null }));
vi.mock("@/components/ShareBox", () => ({ default: () => null }));
vi.mock("@/components/FiltersPanel", () => ({ default: () => null }));
vi.mock("@/components/TaskItem", () => ({ default: ({ task }: { task: Task }) => <li>{task.title}</li> }));
vi.mock("@/components/KanbanView", () => ({ default: () => <div data-testid="kanban-view" /> }));
vi.mock("@/components/GanttView", () => ({ default: () => <div data-testid="gantt-view" /> }));
vi.mock("@/components/WeekView", () => ({ default: () => <div data-testid="week-view" /> }));

const STORAGE_KEY = "task-tracker-view";

const user: CurrentUser = { id: "u1", email: "a@b.com", displayName: "เอ" };
const activeList: TaskList = { id: "list-1", name: "งานของเรา", owner_id: "u1", created_at: "2026-09-01T00:00:00Z" };
const task: Task = {
  id: "1", list_id: "list-1", title: "งานทดสอบ", status: "todo", priority: "medium",
  task_type: "task", start_date: null, due_date: null, assignee_id: null, notes: null,
  tags: [], created_by: "u1", completed_at: null, created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z",
};

function renderBoard() {
  return render(
    <Board user={user} lists={[activeList]} activeList={activeList} tasks={[task]} members={[]} today="2026-09-08" />,
  );
}

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
});

describe("Board view preference", () => {
  it("defaults to Week view when the user has no saved preference", () => {
    renderBoard();
    expect(screen.getByTestId("week-view")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Week" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("remembers the view the user picks across remounts", () => {
    const { unmount } = renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }));
    expect(screen.getByTestId("kanban-view")).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("kanban");
    unmount();

    renderBoard();
    expect(screen.getByTestId("kanban-view")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kanban" }).getAttribute("aria-pressed")).toBe("true");
  });
});
