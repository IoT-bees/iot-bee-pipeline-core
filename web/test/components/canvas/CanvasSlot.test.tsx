import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CanvasSlot } from "@/components/pipelines/canvas/CanvasSlot";
import { encodePayload, DND_MIME } from "@/components/pipelines/canvas/dnd";

function fakeDt(payload: object) {
  const map: Record<string, string> = { [DND_MIME]: encodePayload(payload as never) };
  return {
    getData: (k: string) => map[k] ?? "",
    setData: () => undefined,
    types: Object.keys(map),
    dropEffect: "",
    effectAllowed: "all",
  };
}

describe("CanvasSlot — empty", () => {
  it("renders the kind label and a drop hint", () => {
    render(
      <CanvasSlot
        kind="source"
        state={{ kind: "empty" }}
        onDrop={vi.fn()}
        onWrongKind={vi.fn()}
        onOpen={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText(/conexión/i)).toBeInTheDocument();
    expect(screen.getByText(/seleccionar o soltar aquí/i)).toBeInTheDocument();
  });

  it("has role=button so it is keyboard reachable", () => {
    render(
      <CanvasSlot
        kind="schema"
        state={{ kind: "empty" }}
        onDrop={vi.fn()}
        onWrongKind={vi.fn()}
        onOpen={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /espacio de esquema vacío/i })).toBeInTheDocument();
  });
});

describe("CanvasSlot — drop", () => {
  it("calls onDrop with the resourceType when slotKind matches", () => {
    const onDrop = vi.fn();
    render(
      <CanvasSlot
        kind="source"
        state={{ kind: "empty" }}
        onDrop={onDrop}
        onWrongKind={vi.fn()}
        onOpen={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const slot = screen.getByRole("button", { name: /espacio de conexión vacío/i });
    fireEvent.drop(slot, { dataTransfer: fakeDt({ slotKind: "source", resourceType: "MQTT" }) });
    expect(onDrop).toHaveBeenCalledWith("MQTT");
  });

  it("does NOT call onDrop on mismatched slotKind and reports wrong kind", () => {
    const onDrop = vi.fn();
    const onWrongKind = vi.fn();
    render(
      <CanvasSlot
        kind="schema"
        state={{ kind: "empty" }}
        onDrop={onDrop}
        onWrongKind={onWrongKind}
        onOpen={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const slot = screen.getByRole("button", { name: /espacio de esquema vacío/i });
    fireEvent.drop(slot, { dataTransfer: fakeDt({ slotKind: "source", resourceType: "MQTT" }) });
    expect(onDrop).not.toHaveBeenCalled();
    expect(onWrongKind).toHaveBeenCalledWith("source");
  });
});

describe("CanvasSlot — configuring", () => {
  it("keeps a clear, centered configuration state with a progress indicator", () => {
    render(
      <CanvasSlot
        kind="source"
        state={{ kind: "configuring", resourceType: "MQTT" }}
        onDrop={vi.fn()}
        onWrongKind={vi.fn()}
        onOpen={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/espacio de conexión en configuración/i)).toBeInTheDocument();
    expect(screen.getByText(/configurando conexión/i)).toBeInTheDocument();
    expect(screen.getByText(/completa los datos en la ventana de configuración/i)).toBeInTheDocument();
  });
});
