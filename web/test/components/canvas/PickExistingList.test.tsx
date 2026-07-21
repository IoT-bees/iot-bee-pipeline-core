import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PickExistingList, type ExistingItem } from "@/components/pipelines/canvas/PickExistingList";

const items: ExistingItem[] = [
  { id: 1, name: "mqtt-prod", summary: "topic: sensors/#" },
  { id: 2, name: "mqtt-stage", summary: "topic: stage/#" },
];

describe("PickExistingList", () => {
  it("shows an empty state when items is []", () => {
    render(<PickExistingList items={[]} preselectId={undefined} onSelect={vi.fn()} />);
    expect(screen.getByText(/no hay elementos compatibles/i)).toBeInTheDocument();
  });

  it("highlights the preselected id", () => {
    render(<PickExistingList items={items} preselectId={2} onSelect={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /mqtt-stage/i })).toBeChecked();
  });

  it("calls onSelect on card click", () => {
    const onSelect = vi.fn();
    render(<PickExistingList items={items} preselectId={undefined} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: /mqtt-prod/i }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
