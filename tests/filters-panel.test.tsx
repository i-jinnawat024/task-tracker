import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FiltersPanel from "@/components/FiltersPanel";

function renderPanel(overrides: Partial<Parameters<typeof FiltersPanel>[0]> = {}) {
  const props = {
    status: "all" as const,
    onStatusChange: vi.fn(),
    overdueOnly: false,
    onOverdueOnlyChange: vi.fn(),
    dueFrom: "",
    onDueFromChange: vi.fn(),
    dueTo: "",
    onDueToChange: vi.fn(),
    onClear: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<FiltersPanel {...props} />);
  return props;
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("FiltersPanel", () => {
  it("shows the active status tab and overdue checkbox state", () => {
    renderPanel({ status: "doing", overdueOnly: true });
    expect(screen.getByRole("button", { name: "กำลังทำ" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "ทั้งหมด" }).getAttribute("aria-pressed")).toBe("false");
    expect((screen.getByLabelText("เฉพาะที่เลยกำหนด") as HTMLInputElement).checked).toBe(true);
  });

  it("calls onStatusChange when a status tab is clicked", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "เสร็จแล้ว" }));
    expect(props.onStatusChange).toHaveBeenCalledWith("done");
  });

  it("calls onOverdueOnlyChange when the checkbox is toggled", () => {
    const props = renderPanel({ overdueOnly: false });
    fireEvent.click(screen.getByLabelText("เฉพาะที่เลยกำหนด"));
    expect(props.onOverdueOnlyChange).toHaveBeenCalledWith(true);
  });

  it("calls onDueFromChange when the start of a date range is picked", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "กำหนดเสร็จ (ช่วง)" }));
    fireEvent.click(screen.getByRole("button", { name: "2026-09-05" }));
    expect(props.onDueFromChange).toHaveBeenCalledWith("2026-09-05");
    expect(props.onDueToChange).toHaveBeenCalledWith("");
  });

  it("calls both onDueFromChange and onDueToChange once the end of the range is picked", () => {
    const props = renderPanel({ dueFrom: "2026-09-05" });
    fireEvent.click(screen.getByRole("button", { name: "กำหนดเสร็จ (ช่วง)" }));
    fireEvent.click(screen.getByRole("button", { name: "2026-09-10" }));
    expect(props.onDueFromChange).toHaveBeenCalledWith("2026-09-05");
    expect(props.onDueToChange).toHaveBeenCalledWith("2026-09-10");
  });

  it("does not close the panel when picking a date in the range popup (portal escapes the panel's own DOM)", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "กำหนดเสร็จ (ช่วง)" }));
    const dayButton = screen.getByRole("button", { name: "2026-09-05" });
    fireEvent.pointerDown(dayButton);
    fireEvent.click(dayButton);
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("calls onClear when clicking clear filters", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "ล้างตัวกรอง" }));
    expect(props.onClear).toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const props = renderPanel();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("closes when clicking outside", () => {
    const props = renderPanel();
    fireEvent.pointerDown(document.body);
    expect(props.onClose).toHaveBeenCalled();
  });
});
