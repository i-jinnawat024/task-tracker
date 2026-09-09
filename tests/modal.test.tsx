import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Modal from "@/components/Modal";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("Modal", () => {
  it("locks page scroll while open and restores it after closing", () => {
    const { unmount } = render(
      <Modal title="ทดสอบ" onClose={vi.fn()}>
        เนื้อหา
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores whatever overflow value was set before opening, instead of clobbering it", () => {
    document.body.style.overflow = "scroll";
    const { unmount } = render(
      <Modal title="ทดสอบ" onClose={vi.fn()}>
        เนื้อหา
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });
});
