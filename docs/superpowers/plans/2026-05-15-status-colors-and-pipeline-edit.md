# Spec B — Status colors + pipeline edit / rescale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make pipeline states visible at a glance (correct colors for the real backend vocabulary `Healthy / Idle / Degraded`) and let the user reconfigure a pipeline's source / store / schema / group and its replica count from the detail page, without leaving the screen and without touching the backend.

**Architecture:** Two cleanly separable parts. Part 1 is a localized rewrite of `web/lib/status.ts` plus a rename of two helpers (`isRunning → isHealthy`, `isError → isDegraded`) and an update to a `STOPPED` text fallback. Part 2 is two new components (`EditFieldButton`, `RescaleControl`) wired into `/pipelines/[id]`, plus five react-query mutation hooks and matching `endpoints/pipelines.ts` helpers that call the existing PUT endpoints. All edit operations require the pipeline to be stopped first (predictable behavior, no auto-stop).

**Tech Stack:** Next.js 15, React 19, TypeScript, react-query, react-hook-form (not needed for these forms — controlled state), vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-15-status-colors-and-pipeline-edit-design.md`

---

## File map

```
web/lib/status.ts                                Part 1 — rewrite mapping + rename helpers
web/app/(app)/app/page.tsx                       Part 1 — adopt isHealthy / isDegraded
web/components/pipelines/PipelineActions.tsx     Part 1 — adopt isHealthy (replaces canStop dependence on isRunning)
web/lib/api/endpoints/pipelines.ts               Part 2 — 5 PUT helpers
web/lib/hooks/usePipelines.ts                    Part 2 — 5 mutation hooks
web/components/pipelines/EditFieldButton.tsx     Part 2 — new dialog component
web/components/pipelines/RescaleControl.tsx     Part 2 — new rescale component
web/app/(app)/pipelines/[id]/page.tsx            Part 2 — wires edit + rescale
web/test/lib/status.test.ts                      Part 1 — drive color mapping
web/test/components/EditFieldButton.test.tsx     Part 2 — drive edit behavior + stop-first guard
web/test/components/RescaleControl.test.tsx     Part 2 — drive rescale behavior
```

---

## Part 1 — Color mapping

### Task 1: Drive the new `lib/status.ts` with tests

**Files:**
- Create: `web/test/lib/status.test.ts`
- Modify: `web/lib/status.ts`

- [ ] **Step 1: Create the failing test `web/test/lib/status.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  toPillState,
  isHealthy,
  isDegraded,
  canStop,
} from "@/lib/status";

describe("toPillState", () => {
  it("maps Healthy to running (green)", () => {
    expect(toPillState("Healthy")).toBe("running");
  });
  it("maps Idle to idle (gray)", () => {
    expect(toPillState("Idle")).toBe("idle");
  });
  it("maps Degraded to error (red)", () => {
    expect(toPillState("Degraded")).toBe("error");
  });
  it("treats missing or unknown values as idle", () => {
    expect(toPillState(undefined)).toBe("idle");
    expect(toPillState("STOPPED")).toBe("idle");
    expect(toPillState("nonsense")).toBe("idle");
  });
});

describe("isHealthy / isDegraded", () => {
  it("isHealthy is true only for Healthy", () => {
    expect(isHealthy("Healthy")).toBe(true);
    expect(isHealthy("Degraded")).toBe(false);
    expect(isHealthy("Idle")).toBe(false);
    expect(isHealthy(undefined)).toBe(false);
  });
  it("isDegraded is true only for Degraded", () => {
    expect(isDegraded("Degraded")).toBe(true);
    expect(isDegraded("Healthy")).toBe(false);
    expect(isDegraded(undefined)).toBe(false);
  });
});

describe("canStop", () => {
  it("returns true for Healthy or Degraded (the pipeline is active)", () => {
    expect(canStop("Healthy")).toBe(true);
    expect(canStop("Degraded")).toBe(true);
  });
  it("returns false for Idle, undefined, or STOPPED", () => {
    expect(canStop("Idle")).toBe(false);
    expect(canStop(undefined)).toBe(false);
    expect(canStop("STOPPED")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm failures**

```bash
cd web && pnpm test test/lib/status.test.ts
```

Expected: multiple FAILs — `isHealthy` and `isDegraded` don't exist yet; `toPillState("Healthy")` currently returns `"idle"`; `canStop("Idle")` currently returns `true`.

- [ ] **Step 3: Rewrite `web/lib/status.ts`**

Replace the entire file content with:

```ts
import type { PillState } from "@/components/ui/Pill";

function normalise(s?: string): string {
  return (s ?? "").toUpperCase();
}

export function toPillState(s?: string): PillState {
  const v = normalise(s);
  if (v === "HEALTHY") return "running";
  if (v === "DEGRADED") return "error";
  if (v === "IDLE") return "idle";
  return "idle";
}

export function isHealthy(s?: string): boolean {
  return normalise(s) === "HEALTHY";
}

export function isDegraded(s?: string): boolean {
  return normalise(s) === "DEGRADED";
}

export function canStop(s?: string): boolean {
  const v = normalise(s);
  return v === "HEALTHY" || v === "DEGRADED";
}
```

The `starting` PillState is no longer used by this mapping — there is no backend state that maps to it. It stays valid on the `Pill` component for future use.

- [ ] **Step 4: Run the test and confirm pass**

```bash
cd web && pnpm test test/lib/status.test.ts
```

Expected: all green.

- [ ] **Step 5: Update callsites of the renamed helpers**

`web/app/(app)/app/page.tsx`:

Replace the import on line 15:

```tsx
import { isError, isRunning, toPillState } from "@/lib/status";
```

with:

```tsx
import { isDegraded, isHealthy, toPillState } from "@/lib/status";
```

Replace the two filter lines (around lines 78–80):

```tsx
  const running = list.filter((p) => isRunning(p.pipeline_general_status))
    .length;
  const errored = list.filter((p) => isError(p.pipeline_general_status)).length;
```

with:

```tsx
  const running = list.filter((p) => isHealthy(p.pipeline_general_status))
    .length;
  const errored = list.filter((p) => isDegraded(p.pipeline_general_status))
    .length;
```

- [ ] **Step 6: Run the full test suite**

```bash
cd web && pnpm test
```

Expected: all green, including `test/app/overviewPage.test.tsx` (the STOPPED fallback path still maps to idle).

- [ ] **Step 7: Run typecheck**

```bash
cd web && pnpm typecheck
```

Expected: clean. If any other file imported `isRunning` or `isError`, TS will surface it — fix by renaming the call.

- [ ] **Step 8: Commit**

```bash
git add web/test/lib/status.test.ts web/lib/status.ts 'web/app/(app)/app/page.tsx'
git commit -m "fix(web): align status helpers with backend vocabulary

The backend reports Healthy / Idle / Degraded (see PipelineStatus enum
in domain/value_objects). The frontend mapping checked for RUNNING /
ERROR / IDLE / STARTING — none of which are emitted — so Healthy
pipelines rendered as gray idle. Map Healthy → running (green),
Degraded → error (red), Idle → idle (gray). Rename isRunning →
isHealthy and isError → isDegraded for clarity at callsites."
```

---

## Part 2 — Edit / rescale on `/pipelines/[id]`

### Task 2: PUT helpers in `lib/api/endpoints/pipelines.ts`

**Files:**
- Modify: `web/lib/api/endpoints/pipelines.ts`

These wrap the existing backend endpoints; each returns `Promise<void>` because the backend responds `200 Ok().finish()` with no body.

- [ ] **Step 1: Add the five update methods**

Open `web/lib/api/endpoints/pipelines.ts`. Replace the current `pipelinesApi` export with:

```ts
export const pipelinesApi = {
  list: () => api<Pipeline[]>("/pipelines"),
  get: (id: number) => api<Pipeline>(`/pipelines/${id}`),
  byGroup: (gid: number) => api<Pipeline[]>(`/pipelines/group/${gid}`),
  create: (b: CreatePipelineRequest): Promise<void> =>
    api<null>("/pipelines", { method: "POST", body: JSON.stringify(b) }).then(
      () => undefined,
    ),
  updateSource: (pid: number, sid: number): Promise<void> =>
    api<null>(`/pipelines/data_source/${pid}/${sid}`, { method: "PUT" }).then(
      () => undefined,
    ),
  updateStore: (pid: number, sid: number): Promise<void> =>
    api<null>(`/pipelines/store/${pid}/${sid}`, { method: "PUT" }).then(
      () => undefined,
    ),
  updateSchema: (pid: number, sid: number): Promise<void> =>
    api<null>(`/pipelines/validation_schema/${pid}/${sid}`, {
      method: "PUT",
    }).then(() => undefined),
  updateGroup: (pid: number, gid: number): Promise<void> =>
    api<null>(`/pipelines/group/${pid}/${gid}`, { method: "PUT" }).then(
      () => undefined,
    ),
  updateReplicas: (pid: number, rf: number): Promise<void> =>
    api<null>(`/pipelines/replication_factor/${pid}/${rf}`, {
      method: "PUT",
    }).then(() => undefined),
  remove: (id: number) =>
    api<{ message: string }>(`/pipelines/${id}`, { method: "DELETE" }),
};
```

- [ ] **Step 2: Typecheck**

```bash
cd web && pnpm typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add web/lib/api/endpoints/pipelines.ts
git commit -m "feat(web): add pipeline update endpoint helpers

Wraps the five existing backend PUTs for data_source, store,
validation_schema, group and replication_factor. Each resolves to
void since the backend returns 200 OK with no body."
```

### Task 3: Mutation hooks in `lib/hooks/usePipelines.ts`

**Files:**
- Modify: `web/lib/hooks/usePipelines.ts`

- [ ] **Step 1: Add the five hooks**

Open `web/lib/hooks/usePipelines.ts`. Append the following exports after `useCreatePipeline` (keep `useDeletePipeline` at the bottom):

```ts
export function useUpdatePipelineSource(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (newSourceId: number) =>
      pipelinesApi.updateSource(pipelineId, newSourceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      push({ kind: "success", message: "source updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdatePipelineStore(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (newStoreId: number) =>
      pipelinesApi.updateStore(pipelineId, newStoreId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      push({ kind: "success", message: "store updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdatePipelineSchema(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (newSchemaId: number) =>
      pipelinesApi.updateSchema(pipelineId, newSchemaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      push({ kind: "success", message: "schema updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdatePipelineGroup(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (newGroupId: number) =>
      pipelinesApi.updateGroup(pipelineId, newGroupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      push({ kind: "success", message: "group updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useUpdatePipelineReplicas(pipelineId: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (replicationFactor: number) =>
      pipelinesApi.updateReplicas(pipelineId, replicationFactor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", pipelineId] });
      qc.invalidateQueries({ queryKey: ["pipelines", "list"] });
      push({ kind: "success", message: "replicas updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd web && pnpm typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add web/lib/hooks/usePipelines.ts
git commit -m "feat(web): add update mutation hooks for pipeline fields

useUpdatePipelineSource/Store/Schema/Group/Replicas. Each invalidates
the per-pipeline and list queries on success and surfaces errors
through the toast store."
```

### Task 4: `EditFieldButton` component

**Files:**
- Create: `web/components/pipelines/EditFieldButton.tsx`
- Create: `web/test/components/EditFieldButton.test.tsx`

- [ ] **Step 1: Write the failing test**

`web/test/components/EditFieldButton.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditFieldButton } from "@/components/pipelines/EditFieldButton";

const options = [
  { id: 1, name: "mqtt-a" },
  { id: 2, name: "mqtt-b" },
];

describe("EditFieldButton", () => {
  it("opens a dialog with the current value pre-selected", () => {
    render(
      <EditFieldButton
        label="source"
        currentId={2}
        options={options}
        onChange={vi.fn()}
        pipelineStatus="Idle"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("2");
  });

  it("calls onChange with the chosen id and closes the dialog", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <EditFieldButton
        label="source"
        currentId={1}
        options={options}
        onChange={onChange}
        pipelineStatus="Idle"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("disables apply and shows a warning when the pipeline is Healthy", () => {
    render(
      <EditFieldButton
        label="source"
        currentId={1}
        options={options}
        onChange={vi.fn()}
        pipelineStatus="Healthy"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByText(/stop it first/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
cd web && pnpm test test/components/EditFieldButton.test.tsx
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Create the component**

`web/components/pipelines/EditFieldButton.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { canStop } from "@/lib/status";

interface Props {
  label: string;
  currentId: number | undefined;
  options: { id: number; name: string }[];
  onChange: (newId: number) => Promise<void>;
  pipelineStatus: string | undefined;
}

export function EditFieldButton({
  label,
  currentId,
  options,
  onChange,
  pipelineStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | undefined>(currentId);
  const [busy, setBusy] = useState(false);
  const blocked = canStop(pipelineStatus);

  function handleOpen() {
    setValue(currentId);
    setOpen(true);
  }

  async function handleApply() {
    if (value === undefined || value === currentId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await onChange(value);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-[11px] tracking-[1.5px] text-[var(--color-fg-3)] hover:text-[var(--color-accent)] underline-offset-2 hover:underline"
      >
        [edit]
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="p-5">
          <h3 className="t-section mb-3">{`// edit ${label}`}</h3>
          {blocked && (
            <div className="mb-3 text-[12px] text-[var(--color-danger)]">
              × pipeline is running — stop it first
            </div>
          )}
          <Select
            value={value === undefined ? "" : String(value)}
            onChange={(e) => setValue(Number(e.target.value))}
            disabled={blocked}
          >
            <option value="" disabled>
              -- choose --
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 mt-4 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApply}
              disabled={busy || blocked}
            >
              apply
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
cd web && pnpm test test/components/EditFieldButton.test.tsx
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add web/components/pipelines/EditFieldButton.tsx \
        web/test/components/EditFieldButton.test.tsx
git commit -m "feat(web): EditFieldButton for inline pipeline field edits

Reusable [edit] button that opens a modal with a Select of existing
options. Disables apply with a 'stop first' warning when the pipeline
status reports Healthy or Degraded."
```

### Task 5: `RescaleControl` component

**Files:**
- Create: `web/components/pipelines/RescaleControl.tsx`
- Create: `web/test/components/RescaleControl.test.tsx`

- [ ] **Step 1: Write the failing test**

`web/test/components/RescaleControl.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RescaleControl } from "@/components/pipelines/RescaleControl";

describe("RescaleControl", () => {
  it("does not show an apply button until the value changes", () => {
    render(
      <RescaleControl
        currentValue={3}
        onApply={vi.fn()}
        pipelineStatus="Idle"
      />,
    );
    expect(
      screen.queryByRole("button", { name: /apply/i }),
    ).not.toBeInTheDocument();
  });

  it("clamps at 1 when decrementing past the minimum", () => {
    render(
      <RescaleControl
        currentValue={1}
        onApply={vi.fn()}
        pipelineStatus="Idle"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "−" }));
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls onApply with the new value when applied", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <RescaleControl
        currentValue={2}
        onApply={onApply}
        pipelineStatus="Idle"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(onApply).toHaveBeenCalledWith(3);
  });

  it("disables apply when the pipeline is running", () => {
    render(
      <RescaleControl
        currentValue={2}
        onApply={vi.fn()}
        pipelineStatus="Healthy"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    expect(screen.getByText(/stop it first/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
cd web && pnpm test test/components/RescaleControl.test.tsx
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Create the component**

`web/components/pipelines/RescaleControl.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { canStop } from "@/lib/status";

interface Props {
  currentValue: number;
  onApply: (newValue: number) => Promise<void>;
  pipelineStatus: string | undefined;
}

const MIN = 1;

export function RescaleControl({ currentValue, onApply, pipelineStatus }: Props) {
  const [value, setValue] = useState(currentValue);
  const [busy, setBusy] = useState(false);
  const blocked = canStop(pipelineStatus);
  const changed = value !== currentValue;

  async function handleApply() {
    setBusy(true);
    try {
      await onApply(value);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setValue((v) => Math.max(MIN, v - 1))}
        >
          −
        </Button>
        <span className="font-mono text-[16px] w-6 text-center">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setValue((v) => v + 1)}
        >
          +
        </Button>
      </div>
      {changed && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleApply}
          disabled={busy || blocked}
        >
          apply
        </Button>
      )}
      {changed && blocked && (
        <span className="text-[12px] text-[var(--color-danger)] font-mono">
          × pipeline is running — stop it first
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
cd web && pnpm test test/components/RescaleControl.test.tsx
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add web/components/pipelines/RescaleControl.tsx \
        web/test/components/RescaleControl.test.tsx
git commit -m "feat(web): RescaleControl for adjusting pipeline replica count

Counter with − / + buttons that clamp at 1. Apply button appears only
when the value differs from the persisted replicationFactor and is
disabled with a warning when the pipeline is running."
```

### Task 6: Wire edit + rescale into the pipeline detail page

**Files:**
- Modify: `web/app/(app)/pipelines/[id]/page.tsx`

- [ ] **Step 1: Replace the page content**

Open `web/app/(app)/pipelines/[id]/page.tsx`. Replace the entire file with:

```tsx
"use client";
import { use } from "react";
import Link from "next/link";

import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { PipelineActions } from "@/components/pipelines/PipelineActions";
import { EditFieldButton } from "@/components/pipelines/EditFieldButton";
import { RescaleControl } from "@/components/pipelines/RescaleControl";
import {
  usePipeline,
  useUpdatePipelineGroup,
  useUpdatePipelineReplicas,
  useUpdatePipelineSchema,
  useUpdatePipelineSource,
  useUpdatePipelineStore,
} from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { useSources } from "@/lib/hooks/useSources";
import { useStores } from "@/lib/hooks/useStores";
import { useSchemas } from "@/lib/hooks/useSchemas";
import { useGroups } from "@/lib/hooks/useGroups";
import { fmtId } from "@/lib/fmt";
import { toPillState } from "@/lib/status";

export default function PipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pid = Number(id);
  const { data: p } = usePipeline(pid);
  const { data: allStatus } = usePipelineStatusAll();
  const sources = useSources();
  const stores = useStores();
  const schemas = useSchemas();
  const groups = useGroups();

  const updateSource = useUpdatePipelineSource(pid);
  const updateStore = useUpdatePipelineStore(pid);
  const updateSchema = useUpdatePipelineSchema(pid);
  const updateGroup = useUpdatePipelineGroup(pid);
  const updateReplicas = useUpdatePipelineReplicas(pid);

  const st = allStatus?.find((s) => s.pipeline_id === pid);

  if (!p) return <div className="t-mono">{"// "}loading…</div>;
  const general = st?.pipeline_general_status;
  const replicaEntries = Object.entries(st?.replica_statuses ?? {});

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="t-title">{p.name}</h1>
        <Pill state={toPillState(general)}>
          {(general ?? "STOPPED").toUpperCase()}
        </Pill>
      </div>
      <p className="t-mono mb-4">
        {"// "}pipeline #{fmtId(p.id)} · {p.replicationFactor} replicas
      </p>
      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <PipelineActions id={p.id} name={p.name} status={general} />
        <Link href="/pipelines">
          <Button variant="ghost" size="sm">back to list</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Panel>
          <div className="flex items-center justify-between">
            <div className="t-label">{"// "}SOURCE</div>
            <EditFieldButton
              label="source"
              currentId={p.dataSource?.id}
              options={sources.data ?? []}
              onChange={(newId) => updateSource.mutateAsync(newId)}
              pipelineStatus={general}
            />
          </div>
          <div className="mt-1 font-bold">{p.dataSource?.name ?? "—"}</div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <div className="t-label">{"// "}SCHEMA</div>
            <EditFieldButton
              label="schema"
              currentId={p.dataValidationSchema?.id}
              options={schemas.data ?? []}
              onChange={(newId) => updateSchema.mutateAsync(newId)}
              pipelineStatus={general}
            />
          </div>
          <div className="mt-1 font-bold">
            {p.dataValidationSchema?.name ?? "—"}
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <div className="t-label">{"// "}STORE</div>
            <EditFieldButton
              label="store"
              currentId={p.dataStore?.id}
              options={stores.data ?? []}
              onChange={(newId) => updateStore.mutateAsync(newId)}
              pipelineStatus={general}
            />
          </div>
          <div className="mt-1 font-bold">{p.dataStore?.name ?? "—"}</div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <div className="t-label">{"// "}GROUP</div>
            <EditFieldButton
              label="group"
              currentId={p.pipelineGroup?.id}
              options={groups.data ?? []}
              onChange={(newId) => updateGroup.mutateAsync(newId)}
              pipelineStatus={general}
            />
          </div>
          <div className="mt-1 font-bold">{p.pipelineGroup?.name ?? "—"}</div>
        </Panel>
      </div>

      <h2 className="t-section mb-3">{"// "}replicas</h2>
      <div className="mb-4">
        <RescaleControl
          currentValue={p.replicationFactor}
          onApply={(v) => updateReplicas.mutateAsync(v)}
          pipelineStatus={general}
        />
      </div>

      {replicaEntries.length > 0 && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {replicaEntries.map(([rid, rstatus]) => (
            <Panel key={rid} className="p-3 flex items-center justify-between">
              <span className="font-mono text-[13px]">replica #{rid}</span>
              <Pill state={toPillState(rstatus)}>
                {String(rstatus).toUpperCase()}
              </Pill>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd web && pnpm typecheck
```

Expected: clean.

- [ ] **Step 3: Lint**

```bash
cd web && pnpm lint
```

Expected: clean.

- [ ] **Step 4: Run the full test suite**

```bash
cd web && pnpm test
```

Expected: all green (Spec A overview test still passes — STOPPED fallback still maps to idle).

- [ ] **Step 5: Manual verification**

Start the dev server (`cd web && pnpm dev`) with the backend running.

1. Create a pipeline (or use an existing stopped one).
2. Open `/pipelines/<id>`.
3. Click `[edit]` on SOURCE → modal opens with the current source selected. Change to a different source, click `apply` → toast "source updated", source name on the panel reflects the new value after the query invalidates.
4. Start the pipeline. Status pill turns green `HEALTHY` within 5 s.
5. Click `[edit]` on STORE → modal shows the warning, `apply` is disabled.
6. Stop the pipeline. Click `[edit]` on STORE → can apply.
7. Adjust replicas with `+` → `apply` button appears. Click → toast "replicas updated", header subtitle reflects the new count.

- [ ] **Step 6: Commit**

```bash
git add 'web/app/(app)/pipelines/[id]/page.tsx'
git commit -m "feat(web): inline edit + rescale on pipeline detail page

Each of SOURCE / SCHEMA / STORE / GROUP panels gets an [edit] button
that opens a modal Select of existing options. A RescaleControl
above the replica grid lets the user change the replication factor.
All five edits require the pipeline to be stopped first."
```

---

## Final verification

- [ ] **Step 1: Full suite green**

```bash
cd web && pnpm test && pnpm typecheck && pnpm lint
```

Expected: all clean.

- [ ] **Step 2: Smoke test the color mapping**

With the backend running and at least one pipeline:

1. `/app` overview: stopped pipeline is gray, started pipeline is green `HEALTHY` after the next 5 s refresh. KPI "RUNNING / TOTAL" counts started pipelines.
2. `/pipelines/<id>`: status pill matches.
3. Stop the source container (e.g., `docker compose stop rabbitmq`) to simulate degradation: pill flips to red `DEGRADED` (may take a few seconds for the supervisor to notice).

If `SystemActorSupervisor` is still WIP and never reports status, the pipeline keeps showing `STOPPED` (gray) until the supervisor is fully wired — that is expected and matches Spec A's behavior.
