import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatePicker from "@/components/DatePicker";

afterEach(cleanup);

function mockRect(el: Element, rect: Partial<DOMRect>) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}),
    ...rect,
  } as DOMRect);
}

function openWithRects(label: string, trigger: Partial<DOMRect>, popup: Partial<DOMRect>) {
  render(<DatePicker label={label} />);
  const triggerEl = screen.getByRole("button", { name: label });
  mockRect(triggerEl, trigger);

  fireEvent.click(triggerEl);

  const popupEl = screen.getByRole("dialog", { name: `ปฏิทิน ${label}` });
  mockRect(popupEl, popup);
  fireEvent(window, new Event("resize"));

  return popupEl;
}

describe("DatePicker viewport clamping", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 400);
    vi.stubGlobal("innerHeight", 768);
  });

  it("shifts the calendar left so it stays within the viewport when the trigger sits near the right edge", () => {
    // ปฏิทิน portal ไป document.body แล้ววางด้วยพิกัด viewport ตรงๆ (position:fixed) ไม่ใช่ offset
    // สัมพัทธ์กับปุ่มอีกต่อไป — จึงไม่ล้นออกนอกจอแม้ปุ่มจะอยู่ใน container ที่มี overflow ครอบอยู่ (เช่น modal)
    const popup = openWithRects("ถึงวันที่", { left: 300, right: 400, width: 100, top: 0, bottom: 30 }, { width: 256, height: 0 });

    // popupWidth 256, viewport 400, margin 8 -> desired left = 400-256-8 = 136
    expect(popup.style.left).toBe("136px");
  });

  it("keeps the calendar at the button's position when there's enough room", () => {
    const popup = openWithRects("ตั้งแต่วันที่", { left: 10, right: 110, width: 100, top: 0, bottom: 30 }, { width: 256, height: 0 });

    // desired left = clamp(10, 8, 400-256-8=136) = 10
    expect(popup.style.left).toBe("10px");
  });
});

describe("DatePicker vertical flip", () => {
  it("opens above the trigger when there isn't enough room below", () => {
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 400);

    const popup = openWithRects("กำหนดเสร็จ", { left: 10, right: 110, width: 100, top: 350, bottom: 380 }, { width: 256, height: 300 });

    // spaceBelow = 400-380=20 < needed(300+6+8=314) และ spaceAbove(350) > spaceBelow(20) -> เปิดขึ้นด้านบน
    // top = triggerTop(350) - popupHeight(300) - gap(6) = 44
    expect(popup.style.top).toBe("44px");
  });

  it("opens below the trigger by default when there's enough room", () => {
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 800);

    const popup = openWithRects("วันเริ่ม", { left: 10, right: 110, width: 100, top: 100, bottom: 130 }, { width: 256, height: 300 });

    // top = triggerBottom(130) + gap(6) = 136
    expect(popup.style.top).toBe("136px");
  });
});
