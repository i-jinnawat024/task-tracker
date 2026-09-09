import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewTaskForm from "@/components/NewTaskForm";

const { addTask } = vi.hoisted(() => ({ addTask: vi.fn() }));
vi.mock("@/app/actions", () => ({ addTask }));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("NewTaskForm", () => {
  it("hides the full form behind a trigger button until opened", () => {
    render(<NewTaskForm listId="list-1" />);
    expect(screen.getByRole("button", { name: /เพิ่มงาน/ })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a modal with the full set of fields when the trigger is clicked", () => {
    render(<NewTaskForm listId="list-1" />);
    fireEvent.click(screen.getByRole("button", { name: /เพิ่มงาน/ }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("ชื่องาน")).toBeTruthy();
    expect(screen.getByText("ประเภทงาน")).toBeTruthy();
    expect(screen.getByLabelText("วันเริ่ม")).toBeTruthy();
    expect(screen.getByLabelText("กำหนดเสร็จ")).toBeTruthy();
    expect(screen.getByText("ความสำคัญ")).toBeTruthy();
    expect(screen.getByText("ผู้รับผิดชอบ")).toBeTruthy();
    expect(screen.getByLabelText("เพิ่มแท็ก")).toBeTruthy();
    expect(screen.getByLabelText("รายละเอียด")).toBeTruthy();
  });

  it("submits every field to addTask and closes the modal on success", async () => {
    addTask.mockResolvedValue({ ok: true });
    render(<NewTaskForm listId="list-1" />);
    fireEvent.click(screen.getByRole("button", { name: /เพิ่มงาน/ }));

    fireEvent.change(screen.getByLabelText("ชื่องาน"), { target: { value: "ซื้อของ" } });
    fireEvent.click(screen.getByRole("button", { name: "กำหนดเสร็จ" }));
    fireEvent.click(screen.getByRole("button", { name: "2026-09-20" }));
    fireEvent.click(screen.getByRole("button", { name: "ความสำคัญ" }));
    fireEvent.click(screen.getByRole("option", { name: "สำคัญมาก" }));

    const tagInput = screen.getByLabelText("เพิ่มแท็ก");
    fireEvent.change(tagInput, { target: { value: "บ้าน" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    fireEvent.change(tagInput, { target: { value: "งาน" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    fireEvent.change(screen.getByLabelText("รายละเอียด"), { target: { value: "รายละเอียดงาน" } });
    fireEvent.click(screen.getByRole("button", { name: "เพิ่ม" }));

    await waitFor(() => expect(addTask).toHaveBeenCalled());
    const formData = addTask.mock.calls[0][1] as FormData;
    expect(formData.get("list_id")).toBe("list-1");
    expect(formData.get("title")).toBe("ซื้อของ");
    expect(formData.get("due_date")).toBe("2026-09-20");
    expect(formData.get("priority")).toBe("high");
    expect(formData.get("task_type")).toBe("task");
    expect(formData.get("status")).toBe("todo");
    expect(formData.get("tags")).toBe("บ้าน,งาน");
    expect(formData.get("notes")).toBe("รายละเอียดงาน");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes without submitting when cancel is clicked", () => {
    render(<NewTaskForm listId="list-1" />);
    fireEvent.click(screen.getByRole("button", { name: /เพิ่มงาน/ }));
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(addTask).not.toHaveBeenCalled();
  });

  it("shows a server validation error without closing the modal", async () => {
    addTask.mockResolvedValue({ ok: false, errors: { title: "กรุณาใส่ชื่องาน" } });
    render(<NewTaskForm listId="list-1" />);
    fireEvent.click(screen.getByRole("button", { name: /เพิ่มงาน/ }));
    fireEvent.change(screen.getByLabelText("ชื่องาน"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "เพิ่ม" }));

    expect(await screen.findByText("กรุณาใส่ชื่องาน")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("closes the modal on Escape", () => {
    render(<NewTaskForm listId="list-1" />);
    fireEvent.click(screen.getByRole("button", { name: /เพิ่มงาน/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
