import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DateRangePicker from "@/components/DateRangePicker";

afterEach(cleanup);

function open(label = "กำหนดเสร็จ (ช่วง)") {
  const onChange = vi.fn();
  render(<DateRangePicker label={label} from="" to="" onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: label }));
  return onChange;
}

describe("DateRangePicker", () => {
  it("shows a placeholder when no range is picked", () => {
    render(<DateRangePicker label="กำหนดเสร็จ (ช่วง)" from="" to="" onChange={vi.fn()} />);
    expect(screen.getByText("เลือกช่วงวันที่")).toBeTruthy();
  });

  it("picks the start date first, keeps the calendar open, then picks the end date and closes", () => {
    const onChange = open();
    fireEvent.click(screen.getByRole("button", { name: "2026-09-10" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-09-10", "");
    // ยังไม่ปิด เพราะต้องเลือกวันสิ้นสุดต่อ
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("swaps the order when the second click lands before the first", () => {
    const onChange = vi.fn();
    const { rerender } = render(<DateRangePicker label="กำหนดเสร็จ (ช่วง)" from="2026-09-10" to="" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "กำหนดเสร็จ (ช่วง)" }));
    fireEvent.click(screen.getByRole("button", { name: "2026-09-05" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-05", "2026-09-10");
    rerender(<DateRangePicker label="กำหนดเสร็จ (ช่วง)" from="2026-09-05" to="2026-09-10" onChange={onChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the formatted range on the trigger once both dates are set", () => {
    render(<DateRangePicker label="กำหนดเสร็จ (ช่วง)" from="2026-09-05" to="2026-09-10" onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "กำหนดเสร็จ (ช่วง)" });
    expect(trigger.textContent).toContain("5 ก.ย. 2569");
    expect(trigger.textContent).toContain("10 ก.ย. 2569");
  });

  it("clears both dates and closes when ล้าง is clicked", () => {
    const onChange = vi.fn();
    render(<DateRangePicker label="กำหนดเสร็จ (ช่วง)" from="2026-09-05" to="2026-09-10" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "กำหนดเสร็จ (ช่วง)" }));
    fireEvent.click(screen.getByRole("button", { name: "ล้าง" }));
    expect(onChange).toHaveBeenCalledWith("", "");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("starts a fresh range when clicking again after a full range is already picked", () => {
    const onChange = vi.fn();
    render(<DateRangePicker label="กำหนดเสร็จ (ช่วง)" from="2026-09-05" to="2026-09-10" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "กำหนดเสร็จ (ช่วง)" }));
    fireEvent.click(screen.getByRole("button", { name: "2026-09-15" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-15", "");
  });
});
