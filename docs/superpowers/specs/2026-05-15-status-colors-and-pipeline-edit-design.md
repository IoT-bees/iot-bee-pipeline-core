---
name: status-colors-and-pipeline-edit
description: Spec B — fix status colors to match backend vocabulary (Healthy/Idle/Degraded) and add inline edit + rescale on the pipeline detail page using the existing PUT endpoints.
status: draft
date: 2026-05-15
related:
  - 2026-05-15-frontend-bug-fixes-design (Spec A)
  - 2026-05-15-visual-schema-builder-design (Spec C)
---

# Spec B — Status colors + pipeline edit / rescale

## Goal

After Spec A ships, pipelines do appear in the overview table, but every pill is gray because the frontend's color mapping uses a vocabulary the backend never sends. This spec fixes the color mapping and adds the missing capability to edit a pipeline's wiring (source / schema / store / group) and rescale its replicas, all from the detail page using the PUT endpoints that already exist on the backend.

The motivation is product-facing: a prospect should be able to land on `/pipelines/[id]`, see the right state at a glance, and reconfigure or rescale without leaving the page.

## Non-goals

- Visual builder for schemas / AST operations (Spec C).
- Creating sources, stores, schemas or groups from the edit dialogs — only selecting existing ones. Users who need to create one navigate to the corresponding `new` page.
- A transient "starting…" pill. The backend does not report it, and faking it on the client adds state without payoff.
- Any backend change. The five PUT endpoints already exist.

## Background: actual backend status vocabulary

`crates/domain/src/value_objects/lifecycle_values.rs` defines `PipelineStatus` as `Healthy | Idle | Degraded`, and `PipelineStatusReport::overall_string_status()` serializes those exact strings into `pipeline_general_status`. Replica statuses come from `pipeline_health_by_reply_string()`, which uses the same enum. So the only values the frontend can receive in `pipeline_general_status` or any value of `replica_statuses` today are:

- `"Healthy"`
- `"Idle"`
- `"Degraded"`

The current `lib/status.ts` checks for `RUNNING`, `ERROR`, `FAILED`, `STARTING`, `PENDING` — none of which the backend emits — so `Healthy` falls through to the default `idle` (gray) and `Idle` is misclassified as `starting` (yellow).

## Part 1 — Color mapping

### Change

`web/lib/status.ts` becomes the single source of truth for the mapping:

```ts
export function toPillState(s?: string): PillState {
  const v = (s ?? "").toUpperCase();
  if (v === "HEALTHY") return "running";   // green
  if (v === "DEGRADED") return "error";    // red
  if (v === "IDLE") return "idle";         // gray
  return "idle";                            // STOPPED / unknown / missing
}

export function isHealthy(s?: string): boolean { ... }
export function isDegraded(s?: string): boolean { ... }
```

Old helpers (`isRunning`, `isError`) are renamed to `isHealthy` / `isDegraded` and all callsites are updated. We do not keep backwards-compat aliases — the rename is small and forces a clean cut.

`canStop(s)` keeps its current contract: returns true when the pipeline is reporting any state at all (i.e., the supervisor knows about it).

### Affected files in Part 1

- `web/lib/status.ts`
- `web/app/(app)/app/page.tsx` (`running` and `errored` KPIs)
- `web/components/pipelines/PipelineActions.tsx` (uses `isRunning` today)

No change required to `web/components/ui/Pill.tsx` — its hues already match what we need.

### Verification

- Start a pipeline. After the 5 s refetch, its row in `/app` and `/pipelines` shows a green `HEALTHY` pill. The "RUNNING" KPI counts it.
- Stop the pipeline. Pill flips to gray `IDLE`.
- Simulate a degraded state (kill RabbitMQ container while a pipeline runs). Pill flips to red `DEGRADED`. KPI "ERRORS / DEGRADED" counts it.
- Replicas inside `/pipelines/[id]` follow the same mapping per replica.

## Part 2 — Inline edit + rescale

### UX

On `/pipelines/[id]`, each existing panel (`SOURCE`, `SCHEMA`, `STORE`, `GROUP`) gains a small `[edit]` button that opens a modal containing a `Select` populated with the existing resources of that kind. A new block above the replicas grid hosts a rescale control: a numeric counter with `[–]` and `[+]` buttons and an `apply` button that appears only when the value has changed.

When the pipeline is currently `Healthy` or `Degraded` (i.e., the supervisor reports it as active), every edit dialog and the rescale control show a warning ("Pipeline is running — stop it first") and disable the submit button. The user must click `stop` from the existing `PipelineActions` first. We do not auto-stop / auto-restart on the user's behalf — predictability beats convenience here, and the user has already been bitten by "things that look successful but aren't".

```
pipeline #042   • my-pipeline  ● HEALTHY

//// SOURCE                  //// SCHEMA
mqtt-broker      [edit]      sensors-v2     [edit]

//// STORE                   //// GROUP
influx-prod      [edit]      production     [edit]

//// REPLICAS
  3   [–] [+]   apply
```

### Components

`web/components/pipelines/EditFieldButton.tsx` (new)

Props:

```ts
{
  label: string;                       // e.g. "source"
  currentId: number | undefined;
  options: { id: number; name: string }[];
  onChange: (newId: number) => Promise<void>;
  pipelineStatus: string | undefined;  // to decide warning
  busy?: boolean;
}
```

Renders a `[edit]` button. On click, opens a small dialog with the warning conditional on `pipelineStatus`, a `<Select>` pre-selected to `currentId`, and a submit button. On submit, awaits `onChange` and closes the dialog. Errors from `onChange` bubble up via the existing toast store (handled inside the hook).

`web/components/pipelines/RescaleControl.tsx` (new)

Props:

```ts
{
  currentValue: number;
  onApply: (newValue: number) => Promise<void>;
  pipelineStatus: string | undefined;
  busy?: boolean;
}
```

Manages local `value` state initialized from `currentValue`. `[–]` decrements (min 1), `[+]` increments, both clamp. `apply` button renders only when `value !== currentValue` and is disabled when the pipeline is healthy/degraded. Submitting calls `onApply(value)`.

`min = 1`: a pipeline with zero replicas processes nothing and there is no in-app affordance to re-scale-up while stopped, so allowing 0 is a foot-gun.

### Hooks

`web/lib/hooks/usePipelines.ts` gains five mutations following the existing `useCreatePipeline` shape:

- `useUpdatePipelineSource(pipelineId: number)` → `PUT /pipelines/data_source/{pipelineId}/{dataSourceId}`
- `useUpdatePipelineStore(pipelineId: number)` → `PUT /pipelines/store/{pipelineId}/{dataStoreId}`
- `useUpdatePipelineSchema(pipelineId: number)` → `PUT /pipelines/validation_schema/{pipelineId}/{schemaId}`
- `useUpdatePipelineGroup(pipelineId: number)` → `PUT /pipelines/group/{pipelineId}/{groupId}`
- `useUpdatePipelineReplicas(pipelineId: number)` → `PUT /pipelines/replication_factor/{pipelineId}/{replicationFactor}`

Each `onSuccess` invalidates `["pipelines", pipelineId]` and `["pipelines", "list"]`, and pushes a success toast (e.g., `"source updated"`). `onError` pushes the error message, same pattern as `useCreatePipeline`.

### Endpoints

`web/lib/api/endpoints/pipelines.ts` gains the matching PUT helpers, each returning `api<null>(...)` since the backend responds `200 Ok().finish()` with no body.

```ts
updateSource: (pid: number, sid: number) =>
  api<null>(`/pipelines/data_source/${pid}/${sid}`, { method: "PUT" }),
// ... and analogously for store, validation_schema, group, replication_factor.
```

### Page wiring

`web/app/(app)/pipelines/[id]/page.tsx`:

- Adds the four hook calls for the relational selects: `useSources`, `useStores`, `useSchemas`, `useGroups`.
- Adds the five mutation hooks.
- Each `Panel` for `SOURCE / SCHEMA / STORE / GROUP` renders the current name plus the `EditFieldButton`. The `onChange` prop is the matching `mutateAsync` wrapped to invalidate + close.
- `RescaleControl` is placed between the metadata grid and the replicas grid.

## Affected files (full list)

```
web/lib/status.ts                              (Part 1)
web/app/(app)/app/page.tsx                     (KPIs renamed to isHealthy/isDegraded)
web/components/pipelines/PipelineActions.tsx   (isRunning → isHealthy)
web/components/pipelines/EditFieldButton.tsx   (new)
web/components/pipelines/RescaleControl.tsx    (new)
web/app/(app)/pipelines/[id]/page.tsx          (wires edit + rescale)
web/lib/hooks/usePipelines.ts                  (5 update hooks)
web/lib/api/endpoints/pipelines.ts             (5 PUT helpers)
```

## Risks

- The rename `isRunning → isHealthy` touches every callsite. TypeScript will catch missed ones; the implementation step must run `pnpm tsc --noEmit`.
- The "stop first" rule depends on the supervisor reporting the right status. If `usePipelineStatusAll` is empty (Spec A scenario), the UI sees `STOPPED` and lets the edit through. That is the desired behavior — we treat "supervisor doesn't know about it" as safe-to-edit, since starting it later will pick up the new config.
- Rescaling a healthy pipeline is blocked by the same rule, so we never invoke `update_replication_factor` while replicas are mid-flight. If the backend later supports hot rescaling, we can lift the restriction without removing the warning component (just hide it conditionally).
- We do not invalidate `["pipelines", "status", "all"]` from these mutations. The 5 s refetch picks up new status naturally; an extra invalidate would force a flash of stale data.
