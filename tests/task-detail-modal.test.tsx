import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListMember, Task } from "@/lib/types";
import TaskDetailModal from "@/components/TaskDetailModal";

const { editTask, deleteTaskAction } = vi.hoisted(() => ({
  editTask: vi.fn(),
  deleteTaskAction: vi.fn(),
}));
vi.mock("@/app/actions", () => ({ editTask, deleteTaskAction }));

const task: Task = {
  id: "task-1",
  list_id: "list-1",
  title: "ประชุมทีม",
  notes: "รายละเอียดเดิม",
  status: "doing",
  priority: "high",
  task_type: "meeting",
  start_date: "2026-09-10",
  due_date: "2026-09-20",
  assignee_id: "u1",
  tags: ["บ้าน", "งาน"],
  created_by: "u1",
  completed_at: null,
  created_at: "2026-09-08T00:00:00Z",
  updated_at: "2026-09-08T00:00:00Z",
};

const members: ListMember[] = [
  { list_id: "list-1", user_id: "u1", role: "editor", email: "a@b.com", display_name: "เอ" },
];

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  deleteTaskAction.mockResolvedValue({ ok: true });
});

describe("TaskDetailModal", () => {
  it("shows the task's current values", () => {
    render(<TaskDetailModal task={task} today="2026-09-09" members={members} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect((screen.getByLabelText("ชื่องาน") as HTMLInputElement).value).toBe("ประชุมทีม");
    expect(screen.getByText("กำลังทำ")).toBeTruthy();
    expect(screen.getByText("สำคัญมาก")).toBeTruthy();
    expect(screen.getByText("เอ")).toBeTruthy();
    expect(screen.getByText("#บ้าน")).toBeTruthy();
    expect(screen.getByText("#งาน")).toBeTruthy();
    expect((screen.getByLabelText("รายละเอียด") as HTMLTextAreaElement).value).toBe("รายละเอียดเดิม");
  });

  it("submits the task_id and edited title to editTask, closing on success", async () => {
    editTask.mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<TaskDetailModal task={task} today="2026-09-09" members={members} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("ชื่องาน"), { target: { value: "ประชุมทีม (เลื่อน)" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(editTask).toHaveBeenCalled());
    const formData = editTask.mock.calls[0][1] as FormData;
    expect(formData.get("task_id")).toBe("task-1");
    expect(formData.get("title")).toBe("ประชุมทีม (เลื่อน)");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("submits on Ctrl+Enter from anywhere in the form", async () => {
    editTask.mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<TaskDetailModal task={task} today="2026-09-09" members={members} onClose={onClose} />);

    fireEvent.keyDown(screen.getByLabelText("รายละเอียด"), { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(editTask).toHaveBeenCalled());
    const formData = editTask.mock.calls[0][1] as FormData;
    expect(formData.get("task_id")).toBe("task-1");
  });

  it("shows a server validation error without closing", async () => {
    editTask.mockResolvedValue({ ok: false, errors: { title: "กรุณาใส่ชื่องาน" } });
    const onClose = vi.fn();
    render(<TaskDetailModal task={task} today="2026-09-09" members={members} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));
    expect(await screen.findByText("กรุณาใส่ชื่องาน")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without saving when cancel is clicked", () => {
    const onClose = vi.fn();
    render(<TaskDetailModal task={task} today="2026-09-09" members={members} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(onClose).toHaveBeenCalled();
    expect(editTask).not.toHaveBeenCalled();
  });

  it("deletes the task only after confirming, then closes", async () => {
    const onClose = vi.fn();
    render(<TaskDetailModal task={task} today="2026-09-09" members={members} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "ลบงานนี้" }));
    expect(deleteTaskAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "ลบจริง" }));
    await waitFor(() => expect(deleteTaskAction).toHaveBeenCalledWith("task-1"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
