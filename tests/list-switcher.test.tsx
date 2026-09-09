import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskList } from "@/lib/types";
import ListSwitcher from "@/components/ListSwitcher";

const lists: TaskList[] = [
  { id: "1", name: "งานของเรา", owner_id: "u1", created_at: "2026-09-08T00:00:00Z" },
  { id: "2", name: "งานของบ้าน", owner_id: "u1", created_at: "2026-09-08T00:00:00Z" },
];

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("ListSwitcher", () => {
  it("shows the active list's name on the trigger and keeps the menu closed initially", () => {
    render(<ListSwitcher lists={lists} activeId="1" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "งานของเรา" })).toBeTruthy();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("opens the menu on click and lists every list as an option", () => {
    render(<ListSwitcher lists={lists} activeId="1" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "งานของเรา" }));
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("option", { name: "งานของเรา" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("option", { name: "งานของบ้าน" }).getAttribute("aria-selected")).toBe("false");
  });

  it("calls onSelect and closes the menu when an option is clicked", () => {
    const onSelect = vi.fn();
    render(<ListSwitcher lists={lists} activeId="1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "งานของเรา" }));
    fireEvent.click(screen.getByRole("option", { name: "งานของบ้าน" }));
    expect(onSelect).toHaveBeenCalledWith("2");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes the menu on Escape without calling onSelect", () => {
    const onSelect = vi.fn();
    render(<ListSwitcher lists={lists} activeId="1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "งานของเรา" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("closes the menu when clicking outside", () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <ListSwitcher lists={lists} activeId="1" onSelect={vi.fn()} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "งานของเรา" }));
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
