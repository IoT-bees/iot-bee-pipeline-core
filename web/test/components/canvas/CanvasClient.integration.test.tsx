import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CanvasClient } from "@/components/pipelines/canvas/CanvasClient";
import { DND_MIME, encodePayload } from "@/components/pipelines/canvas/dnd";

const pushSpy = vi.fn();
vi.mock("@/lib/store/useToasts", () => ({
  useToasts: <T,>(sel: (s: { push: typeof pushSpy }) => T) => sel({ push: pushSpy }),
}));

const routerPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/pipelines/new",
}));

const baseSources = [
  { id: 1, name: "src-alpha", sourceType: "MQTT", dataSourceDescription: "primary broker", config: {} },
];
const baseSchemas = [
  { id: 11, name: "sch-beta", schema: { temperature: { type: "float", required: true } } },
];
const baseStores = [
  { id: 21, name: "store-gamma", storeType: "INFLUX_DB", dataStoreDescription: "timeseries db", config: {} },
];
const baseGroups = [{ id: 1, name: "Default", description: "" }];

let pipelineHandler: ReturnType<typeof http.post>;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  pushSpy.mockReset();
  routerPush.mockReset();
});
afterAll(() => server.close());

beforeEach(() => {
  pipelineHandler = http.post("*/pipelines", () => HttpResponse.json(null, { status: 201 }));
});

function defaultHandlers() {
  return [
    http.get("*/data-sources", () => HttpResponse.json(baseSources)),
    http.get("*/validation-schemas", () => HttpResponse.json(baseSchemas)),
    http.get("*/data-stores", () => HttpResponse.json(baseStores)),
    http.get("*/pipeline-groups", () => HttpResponse.json(baseGroups)),
    pipelineHandler,
  ];
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["sources"], baseSources);
  qc.setQueryData(["schemas"], baseSchemas);
  qc.setQueryData(["stores"], baseStores);
  qc.setQueryData(["groups"], baseGroups);
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

async function pickExisting(slotLabel: RegExp, useLabel: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: slotLabel }));
  fireEvent.click(await screen.findByRole("tab", { name: /elegir existente/i }));
  const card = await screen.findAllByRole("radio");
  fireEvent.click(card[0]);
  fireEvent.click(screen.getByRole("button", { name: useLabel }));
}

describe("CanvasClient integration", () => {
  it("opens resource configuration in a modal and closes it with Escape", async () => {
    server.use(...defaultHandlers());
    render(wrap(<CanvasClient />));

    fireEvent.click(screen.getByRole("button", { name: /espacio de conexión vacío/i }));

    expect(await screen.findByRole("dialog", { name: /configurar conexión/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /espacio de conexión vacío/i })).toBeInTheDocument();
  });

  it("abre y cierra el menú de demos al elegir una plantilla", async () => {
    server.use(...defaultHandlers());
    render(wrap(<CanvasClient />));

    const trigger = screen.getByRole("button", { name: /cargar demo/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: /demo en vivo/i }));

    expect(screen.queryByRole("menu", { name: /plantillas de demo/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /demo aplicada/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("happy path · pick existing for all three slots + deploy redirects", async () => {
    server.use(...defaultHandlers());
    render(wrap(<CanvasClient />));

    await pickExisting(/espacio de conexión vacío/i, /usar conexión/i);
    await waitFor(() =>
      expect(screen.getAllByText(/src-alpha/i).length).toBeGreaterThan(0),
    );

    await pickExisting(/espacio de esquema vacío/i, /usar esquema/i);
    await waitFor(() => expect(screen.getAllByText(/sch-beta/i).length).toBeGreaterThan(0));

    await pickExisting(/espacio de destino vacío/i, /usar destino/i);
    await waitFor(() => expect(screen.getAllByText(/store-gamma/i).length).toBeGreaterThan(0));

    const nameInput = screen.getByPlaceholderText(/frio-cliente-a/i);
    fireEvent.change(nameInput, { target: { value: "e2e-pipe" } });

    fireEvent.click(screen.getByRole("button", { name: /crear proyecto/i }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pipelines"));
  });

  it("plan-limit failure · 402 keeps slots filled and fires error toast", async () => {
    pipelineHandler = http.post("*/pipelines", () =>
      HttpResponse.json({ error: "plan max reached" }, { status: 402 }),
    );
    server.use(...defaultHandlers());
    render(wrap(<CanvasClient />));

    await pickExisting(/espacio de conexión vacío/i, /usar conexión/i);
    await pickExisting(/espacio de esquema vacío/i, /usar esquema/i);
    await pickExisting(/espacio de destino vacío/i, /usar destino/i);

    fireEvent.change(screen.getByPlaceholderText(/frio-cliente-a/i), { target: { value: "overflow" } });
    fireEvent.click(screen.getByRole("button", { name: /crear proyecto/i }));

    await waitFor(() =>
      expect(pushSpy).toHaveBeenCalledWith(expect.objectContaining({ kind: "error" })),
    );
    expect(routerPush).not.toHaveBeenCalled();
    expect(screen.getAllByText(/src-alpha/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sch-beta/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/store-gamma/i).length).toBeGreaterThan(0);
  });

  it("wrong-kind drop · fires error toast and does NOT change slot state", async () => {
    server.use(...defaultHandlers());
    render(wrap(<CanvasClient />));

    const schemaSlot = screen.getByRole("button", { name: /espacio de esquema vacío/i });
    const dataMap: Record<string, string> = {
      [DND_MIME]: encodePayload({ slotKind: "source", resourceType: "MQTT" }),
    };
    fireEvent.drop(schemaSlot, {
      dataTransfer: {
        getData: (k: string) => dataMap[k] ?? "",
        types: Object.keys(dataMap),
      },
    });

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "error", message: expect.stringMatching(/conexión no corresponde al espacio de esquema/i) }),
    );
    expect(screen.queryByText(/configurando/i)).toBeNull();
  });
});
