# Spec A — Frontend bug fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three frontend-only fixes so a first-time user can run through the app without hitting visible defects: the Influx store form no longer fills `MEASUREMENT` / `TOKEN` with browser-saved credentials, creating any resource no longer shows a red "failed" toast even though the resource was persisted, and the overview page (`/app`) shows all pipelines from the database (not only those the actor supervisor knows about).

**Architecture:** All changes live under `web/`. Bug 1 is a markup-only fix on one form. Bug 2 is a typed-API refactor: backend create endpoints return `201 Created` with an empty body, so the frontend's `endpoints/*.ts` create helpers become `api<null>` and the `useCreateXxx` hooks no longer surface a created entity. Bug 3 swaps the source of truth on the overview from `usePipelineStatusAll()` (which can be empty when the WIP `SystemActorSupervisor` is not reporting) to `usePipelines()` + a status map join, mirroring how `/pipelines` already works.

**Tech Stack:** Next.js 15, React 19, TypeScript, react-query, react-hook-form, vitest + @testing-library/react (jsdom).

**Spec:** `docs/superpowers/specs/2026-05-15-frontend-bug-fixes-design.md`

---

## File map

```
web/components/forms/DataStoreForm.tsx            Bug 1 — add autoComplete attrs
web/lib/api/endpoints/stores.ts                   Bug 2 — create() returns api<null>
web/lib/api/endpoints/sources.ts                  Bug 2 — same
web/lib/api/endpoints/schemas.ts                  Bug 2 — same
web/lib/api/endpoints/pipelines.ts                Bug 2 — same
web/lib/api/endpoints/groups.ts                   Bug 2 — same
web/lib/hooks/useStores.ts                        Bug 2 — mutation no longer typed by entity
web/lib/hooks/useSources.ts                       Bug 2 — same
web/lib/hooks/useSchemas.ts                       Bug 2 — same
web/lib/hooks/usePipelines.ts                     Bug 2 — same
web/lib/hooks/useGroups.ts                        Bug 2 — same
web/app/(app)/app/page.tsx                        Bug 3 — list from usePipelines, join status
web/test/api/createEndpoint.test.ts               Bug 2 — new unit test (drives the fix)
web/test/app/overviewPage.test.tsx                Bug 3 — new component test (drives the fix)
```

---

## Task 1: Bug 1 — Influx form autofill

**Files:**
- Modify: `web/components/forms/DataStoreForm.tsx`

This bug is the browser's password manager autofilling `MEASUREMENT` and `TOKEN` because `TOKEN` is `type="password"`. We add explicit `autoComplete` attributes. jsdom does not simulate browser autofill, so there is no useful automated test — verification is manual against a real browser session with at least one saved password.

- [ ] **Step 1: Open `web/components/forms/DataStoreForm.tsx` and locate the `<form>` element at line 64**

The current code:

```tsx
<form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-[640px]">
```

- [ ] **Step 2: Add `autoComplete="off"` to the form**

Change to:

```tsx
<form
  onSubmit={form.handleSubmit(handleSubmit)}
  className="max-w-[640px]"
  autoComplete="off"
>
```

- [ ] **Step 3: Add `autoComplete="off"` to the four non-password Influx inputs**

Locate the `INFLUX_DB` block (around lines 84–110). For each `<Input ... />` inside that block — `url`, `data_base`, `measurement`, `tag_fields` — add `autoComplete="off"`. Example for `url`:

```tsx
<FormField label="URL">
  <Input
    {...form.register("config.url" as const)}
    placeholder="http://influxdb:8086"
    autoComplete="off"
  />
</FormField>
```

Apply the same prop to `data_base`, `measurement`, and `tag_fields`. Do **not** modify any other field outside the `INFLUX_DB` block.

- [ ] **Step 4: Add `autoComplete="new-password"` to the TOKEN input**

The token input keeps `type="password"` and gains `autoComplete="new-password"`:

```tsx
<FormField label="TOKEN">
  <Input
    {...form.register("config.token" as const)}
    type="password"
    autoComplete="new-password"
  />
</FormField>
```

- [ ] **Step 5: Typecheck**

Run from `web/`:

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Manual verification**

Start the dev server:

```bash
pnpm dev
```

In Chrome with at least one site-password saved, go to `/stores/new`, switch type to `INFLUX_DB`. `MEASUREMENT` and `TOKEN` must remain empty until the user types. The other fields (`URL`, `DATABASE`, `TAG FIELDS`) must also remain empty. Refresh, repeat — autofill must not engage.

- [ ] **Step 7: Commit**

```bash
git add web/components/forms/DataStoreForm.tsx
git commit -m "fix(web): disable browser autofill on InfluxDB store form

The TOKEN field's type=password caused Chrome to autofill it (and the
preceding MEASUREMENT field) with saved credentials. Explicit
autoComplete attributes defeat that behavior."
```

---

## Task 2: Bug 2 — False error toast on resource create

**Files:**
- Create: `web/test/api/createEndpoint.test.ts`
- Modify: `web/lib/api/endpoints/stores.ts`
- Modify: `web/lib/api/endpoints/sources.ts`
- Modify: `web/lib/api/endpoints/schemas.ts`
- Modify: `web/lib/api/endpoints/pipelines.ts`
- Modify: `web/lib/api/endpoints/groups.ts`
- Modify: `web/lib/hooks/useStores.ts`
- Modify: `web/lib/hooks/useSources.ts`
- Modify: `web/lib/hooks/useSchemas.ts`
- Modify: `web/lib/hooks/usePipelines.ts`
- Modify: `web/lib/hooks/useGroups.ts`

The backend returns `201 Created` with an empty body for every resource create. The frontend currently does `api<RawStore>(...)` then `normalize(raw)` — `raw` is `null` and `normalize` throws. The fix: type the create call as `api<null>`, drop the entity-typed return, keep the existing list-invalidation behavior on success.

We drive this with one TDD cycle on the stores endpoint (the user-visible bug is most often reproduced there because Influx is the first thing people try). The other four follow the same edit pattern with no new behavior to test.

### TDD cycle on `storesApi.create`

- [ ] **Step 1: Create the failing test file `web/test/api/createEndpoint.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storesApi } from "@/lib/api/endpoints/stores";

const originalFetch = globalThis.fetch;

describe("storesApi.create", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("resolves without throwing when the backend returns 201 with an empty body", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("", { status: 201 }),
    );

    await expect(
      storesApi.create({
        name: "influx-prod",
        dataStoreConfiguration: {
          persistenceType: "LOCAL_LOG",
          log_name: "debug",
        },
        dataStoreDescription: "test",
      }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd web && pnpm test test/api/createEndpoint.test.ts
```

Expected: FAIL with a `TypeError` from `normalize(null)` (the current implementation calls `raw.storeType` on `null`).

- [ ] **Step 3: Refactor `storesApi.create` to return void**

Open `web/lib/api/endpoints/stores.ts`. Replace the current `create` block (lines 70–76):

```ts
create: async (b: CreateDataStoreRequest): Promise<DataStore> => {
  const raw = await api<RawDataStore>("/data-stores", {
    method: "POST",
    body: JSON.stringify(b),
  });
  return normalize(raw);
},
```

with:

```ts
create: (b: CreateDataStoreRequest): Promise<void> =>
  api<null>("/data-stores", {
    method: "POST",
    body: JSON.stringify(b),
  }).then(() => undefined),
```

(`api<null>` resolves to `null` per the client; we coerce to `void` so the hook's `mutateAsync` returns `Promise<void>`.)

- [ ] **Step 4: Update the `useCreateStore` hook signature**

Open `web/lib/hooks/useStores.ts`. The current `useCreateStore` typed `mutationFn` as `(b: CreateDataStoreRequest) => storesApi.create(b)` returning `DataStore`. Now it returns `void`. The hook code itself works as-is because it never reads the result, but TS will infer the new type. Confirm no callsite reads the return — see Step 5.

- [ ] **Step 5: Run typecheck to verify no caller reads the entity**

```bash
cd web && pnpm typecheck
```

Expected: clean. If anything errors with "Type 'void' is not assignable to ..." we have a hidden caller; surface it before continuing.

- [ ] **Step 6: Run the test and confirm it passes**

```bash
cd web && pnpm test test/api/createEndpoint.test.ts
```

Expected: PASS.

### Apply the same pattern to the remaining four endpoints

- [ ] **Step 7: Refactor `sourcesApi.create` in `web/lib/api/endpoints/sources.ts`**

Replace lines 83–89:

```ts
create: async (b: CreateDataSourceRequest): Promise<DataSource> => {
  const raw = await api<RawDataSource>("/data-sources", {
    method: "POST",
    body: JSON.stringify(b),
  });
  return normalize(raw);
},
```

with:

```ts
create: (b: CreateDataSourceRequest): Promise<void> =>
  api<null>("/data-sources", {
    method: "POST",
    body: JSON.stringify(b),
  }).then(() => undefined),
```

- [ ] **Step 8: Refactor `schemasApi.create` in `web/lib/api/endpoints/schemas.ts`**

Replace lines 36–42:

```ts
create: async (b: CreateValidationSchemaRequest): Promise<ValidationSchema> => {
  const raw = await api<RawValidationSchema>("/validation-schemas", {
    method: "POST",
    body: JSON.stringify(b),
  });
  return normalize(raw);
},
```

with:

```ts
create: (b: CreateValidationSchemaRequest): Promise<void> =>
  api<null>("/validation-schemas", {
    method: "POST",
    body: JSON.stringify(b),
  }).then(() => undefined),
```

- [ ] **Step 9: Refactor `pipelinesApi.create` in `web/lib/api/endpoints/pipelines.ts`**

Replace line 8–9:

```ts
create: (b: CreatePipelineRequest) =>
  api<Pipeline>("/pipelines", { method: "POST", body: JSON.stringify(b) }),
```

with:

```ts
create: (b: CreatePipelineRequest): Promise<void> =>
  api<null>("/pipelines", { method: "POST", body: JSON.stringify(b) }).then(
    () => undefined,
  ),
```

- [ ] **Step 10: Refactor `groupsApi.create` in `web/lib/api/endpoints/groups.ts`**

Replace lines 7–11:

```ts
create: (b: CreatePipelineGroupRequest) =>
  api<PipelineGroup>("/pipeline-groups", {
    method: "POST",
    body: JSON.stringify(b),
  }),
```

with:

```ts
create: (b: CreatePipelineGroupRequest): Promise<void> =>
  api<null>("/pipeline-groups", {
    method: "POST",
    body: JSON.stringify(b),
  }).then(() => undefined),
```

- [ ] **Step 11: Run the full test suite**

```bash
cd web && pnpm test
```

Expected: all pass, including `test/api/createEndpoint.test.ts`.

- [ ] **Step 12: Run typecheck**

```bash
cd web && pnpm typecheck
```

Expected: clean. If errors surface in pages under `app/(app)/*/new/page.tsx`, the caller is reading the discarded return — none should, but confirm.

- [ ] **Step 13: Manual smoke test**

Start dev server (`pnpm dev`) and create one of each resource through the UI: a data store, a data source, a schema, a pipeline, a group. Each must produce a green toast (e.g., "store created"), no red toast, and the new item must appear in its list page.

- [ ] **Step 14: Commit**

```bash
git add web/test/api/createEndpoint.test.ts \
        web/lib/api/endpoints/stores.ts \
        web/lib/api/endpoints/sources.ts \
        web/lib/api/endpoints/schemas.ts \
        web/lib/api/endpoints/pipelines.ts \
        web/lib/api/endpoints/groups.ts
git commit -m "fix(web): stop treating 201 Created (empty body) as a parse error

The backend returns 201 with no body on every create endpoint. The
frontend was running the response through a normalize() that assumed a
JSON entity, throwing a TypeError that surfaced as a red toast even
though the resource had been persisted. Create endpoints now resolve
to void; list queries pick the new resource up via the existing
onSuccess invalidations."
```

(`useStores.ts`, `useSources.ts`, `useSchemas.ts`, `usePipelines.ts`, `useGroups.ts` need no edits since the hook implementations already discard the return; the commit above intentionally does not include them.)

---

## Task 3: Bug 3 — Overview must list all pipelines, not only those reported by status

**Files:**
- Create: `web/test/app/overviewPage.test.tsx`
- Modify: `web/app/(app)/app/page.tsx`

The overview page derives its table rows from `usePipelineStatusAll()`, which calls `/pipeline-lifecycle/status`. That endpoint walks the actor system to report live status. Per `CLAUDE.md`, the top-level `SystemActorSupervisor` is wired only partially today, so the endpoint can return an empty list even when pipelines exist in the DB. We mirror the `/pipelines` page: source rows from `usePipelines()`, join status from `usePipelineStatusAll()`, default missing status to `STOPPED`.

### TDD cycle

- [ ] **Step 1: Create the failing test `web/test/app/overviewPage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/usePipelineStatusAll", () => ({
  usePipelineStatusAll: () => ({ data: [], isLoading: false, isPending: false }),
}));
vi.mock("@/lib/hooks/usePipelines", () => ({
  usePipelines: () => ({
    data: [
      {
        id: 7,
        name: "weather-ingest",
        replicationFactor: 1,
        isActive: false,
      },
    ],
    isPending: false,
  }),
}));
vi.mock("@/lib/hooks/useSources", () => ({
  useSources: () => ({ data: [], isPending: false }),
}));
vi.mock("@/lib/hooks/useStores", () => ({
  useStores: () => ({ data: [], isPending: false }),
}));
vi.mock("@/lib/hooks/useSchemas", () => ({
  useSchemas: () => ({ data: [], isPending: false }),
}));
vi.mock("@/lib/hooks/useGroups", () => ({
  useGroups: () => ({ data: [], isPending: false }),
}));

import Overview from "@/app/(app)/app/page";

describe("Overview page", () => {
  it("lists a pipeline that exists in the DB even when the status endpoint is empty", () => {
    render(<Overview />);
    expect(screen.getByText("weather-ingest")).toBeInTheDocument();
    // STOPPED pill should appear since no status was reported for id 7
    expect(screen.getAllByText(/stopped/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd web && pnpm test test/app/overviewPage.test.tsx
```

Expected: FAIL. The current page renders the "no pipelines yet" panel because `list` is derived from the (empty) status response.

- [ ] **Step 3: Edit `web/app/(app)/app/page.tsx` — switch the table source**

Open `web/app/(app)/app/page.tsx`. Update the imports block (lines 9–14) so it includes `usePipelines`:

```tsx
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { usePipelines } from "@/lib/hooks/usePipelines";
import { useSources } from "@/lib/hooks/useSources";
import { useStores } from "@/lib/hooks/useStores";
import { useSchemas } from "@/lib/hooks/useSchemas";
import { useGroups } from "@/lib/hooks/useGroups";
```

Replace the block at lines 60–67 that builds `list`:

```tsx
  const { data: status, isLoading, isPending: statusPending } =
    usePipelineStatusAll();
  const sourcesQ = useSources();
  const storesQ = useStores();
  const schemasQ = useSchemas();
  const groupsQ = useGroups();

  const list = status ?? [];
```

with:

```tsx
  const { data: status, isPending: statusPending } = usePipelineStatusAll();
  const { data: pipes, isPending: pipesPending } = usePipelines();
  const sourcesQ = useSources();
  const storesQ = useStores();
  const schemasQ = useSchemas();
  const groupsQ = useGroups();

  const isLoading = statusPending || pipesPending;

  const statusByPid = new Map(
    (status ?? []).map((s) => [s.pipeline_id, s.pipeline_general_status]),
  );
  const list = (pipes ?? []).map((p) => ({
    pipeline_id: p.id,
    pipeline_name: p.name,
    pipeline_general_status: statusByPid.get(p.id),
  }));
```

The KPI computations (`running`, `errored`, `total`) keep using `list` — they now reflect "total = pipelines in DB" and "running / errored = those whose reported status matches". That is the intended semantic.

The `setupReady` condition references `statusPending` and the other resource `isPending` flags. Leave it as-is; it doesn't need `pipesPending` because the onboarding checklist treats `total > 0` (i.e., any pipeline in DB) as step 5 done, which now reflects DB state correctly.

- [ ] **Step 4: Run the test and confirm it passes**

```bash
cd web && pnpm test test/app/overviewPage.test.tsx
```

Expected: PASS — the pipeline name renders and a STOPPED pill is shown.

- [ ] **Step 5: Run the full test suite**

```bash
cd web && pnpm test
```

Expected: all pass.

- [ ] **Step 6: Run typecheck**

```bash
cd web && pnpm typecheck
```

Expected: clean. The shape of items in `list` changed slightly — they no longer carry the rest of `PipelineStatusResponse`, only the three fields used by the table. Confirm no usage of `list[i].replica_statuses` or similar inside `app/page.tsx`. (There is none today; the replica grid lives on `/pipelines/[id]`.)

- [ ] **Step 7: Manual verification**

Start the dev server, create a pipeline but do not start it. Go to `/app`. The pipeline must appear with a gray `STOPPED` pill (Spec B will turn this green once started; for now starting it still produces a gray pill because `Healthy` isn't mapped — that is the Spec B fix and out of scope here). The KPI "RUNNING" stays at 0 until Spec B re-maps, but "TOTAL PIPELINES" must reflect the DB count.

- [ ] **Step 8: Commit**

```bash
git add web/test/app/overviewPage.test.tsx web/app/(app)/app/page.tsx
git commit -m "fix(web): overview lists pipelines from DB, joining live status

The overview's table used to source rows from /pipeline-lifecycle/status,
which depends on the WIP SystemActorSupervisor and can be empty even
when pipelines exist. Source from /pipelines (DB) and decorate with
status, mirroring how /pipelines already works. Missing status defaults
to STOPPED."
```

---

## Final verification

- [ ] **Step 1: Run the full suite once more**

```bash
cd web && pnpm test && pnpm typecheck && pnpm lint
```

Expected: all clean.

- [ ] **Step 2: End-to-end manual sanity check**

Walk the full create-flow once:
1. `/sources/new` → create a RabbitMQ source. Toast green.
2. `/schemas/new` → create a schema (paste the example JSON). Toast green.
3. `/stores/new` → INFLUX_DB. `MEASUREMENT` and `TOKEN` empty. Fill, submit. Toast green.
4. `/groups` → create a group. Toast green.
5. `/pipelines/new` → wire them, submit. Toast green.
6. `/app` → the new pipeline appears with `STOPPED` pill.

All five resources must persist and the overview must list the pipeline without any user interacting with the actor system.

- [ ] **Step 3: Push the branch**

```bash
git push
```

(Only run this if the user explicitly authorizes pushing the branch — do not push as part of the plan unless asked.)
