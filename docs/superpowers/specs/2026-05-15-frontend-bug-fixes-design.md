---
name: frontend-bug-fixes
description: Spec A — three frontend bugs that erode user trust (Influx form autofill, false-error toast on create, overview not listing pipelines). Frontend-only, no backend changes.
status: draft
date: 2026-05-15
related:
  - 2026-05-15-status-colors-and-pipeline-edit-design (Spec B)
  - 2026-05-15-visual-schema-builder-design (Spec C)
---

# Spec A — Frontend bug fixes

## Goal

Fix three visible defects that break the user's trust in the web UI on the first run-through:

1. The Influx store form pre-fills `MEASUREMENT` and `TOKEN` with the browser's saved credentials.
2. Creating any resource (store / source / schema / pipeline / group) shows a red error toast even though the resource is actually persisted.
3. The overview page (`/app`) does not list pipelines that have been created, even when some are running.

These are all frontend-only and ship as one slice so a clean run-through (create source → schema → store → pipeline → see it in overview) works end-to-end.

## Non-goals

- New colors / state semantics for pills (Spec B).
- Update / rescale endpoints (Spec B).
- Visual schema or operation builder (Spec C).
- Backend changes — every fix here stays in `web/`.

## Bug 1 — Influx form autofill

### Root cause

`web/components/forms/DataStoreForm.tsx` renders the `TOKEN` input as `type="password"`. Browser password managers detect that and autofill the nearest "username-shaped" input above it (in this case `MEASUREMENT`) plus the password. There is no `autoComplete` attribute anywhere on the form, so the default heuristic wins.

### Change

In `DataStoreForm.tsx`:

- Add `autoComplete="off"` to the `<form>`.
- Add `autoComplete="off"` to every `Input` inside the `INFLUX_DB` branch (`url`, `data_base`, `measurement`, `tag_fields`).
- For the `TOKEN` input, use `autoComplete="new-password"` (keeps masking, defeats autofill on every major browser).

No changes to the schema or submit payload.

### Verification

Open Chrome with at least one saved password for any site, go to `/stores/new`, switch type to `INFLUX_DB`. `MEASUREMENT` and `TOKEN` must remain empty until the user types.

## Bug 2 — False error toast on create

### Root cause

The backend returns `201 Created` with an **empty body** on every create endpoint (`HttpResponse::Created().finish()` in `data_store`, `data_sources`, `validation_schemas`, `pipeline_data`, `pipeline_groups`). The frontend `endpoints/*.ts` files type the response as the created entity and then call `normalize(raw)`. When `raw` is `null`, `normalize` throws a `TypeError`, react-query routes that into `onError`, and the user sees a red toast even though the resource is in the DB.

### Change (frontend-only)

For each of the five `endpoints/*.ts` files (`stores`, `sources`, `schemas`, `pipelines`, `groups`):

- Change `create()` from `api<RawXxx>(...)` returning the normalized entity, to `api<null>(...)` returning `void`.

For each `useCreateXxx` hook in `lib/hooks/`:

- Drop the type parameter of `useMutation` so it no longer expects an entity back.
- `onSuccess` already invalidates the list query and shows a "created" toast — that stays.

For each `app/(app)/*/new/page.tsx` page:

- `mutateAsync(payload)` is followed by `router.push(<list>)` already. No callsite reads the returned entity. Confirm during implementation that nothing breaks.

Trade-off: when we eventually want "create and jump to detail page" we'll need the id back, which means either a follow-up GET or a backend change. We accept that as a future-Spec problem rather than absorbing the backend touch here.

### Verification

Create one of each resource via the UI. Toast must be green ("xxx created"), not red, and the resource must appear in its list immediately.

## Bug 3 — Overview not listing pipelines

### Root cause

`web/app/(app)/app/page.tsx` derives its pipeline table directly from `usePipelineStatusAll()`, which calls `GET /pipeline-lifecycle/status`. That endpoint walks the actor system to report live status. Per `CLAUDE.md`, the top-level `SystemActorSupervisor` is wired only partially today, so the endpoint can return an empty list even when pipelines exist in the DB. The `/pipelines` page does not have this problem because it sources from `usePipelines()` (DB-backed list) and merges status as decoration.

### Change

In `app/(app)/app/page.tsx`:

- Use `usePipelines()` as the source of the table rows.
- Build a `Map<pipeline_id, status>` from `usePipelineStatusAll()` and join it into each row.
- When a pipeline has no entry in the status map, render the pill as `STOPPED` (gray) — same default `/pipelines` already shows.
- KPIs (`running`, `errored`, `total`) keep reading from the status list: those numbers describe what the supervisor reports, which is the right semantic for "running / errored".
- `isLoading` becomes true while either query is pending so the table doesn't flash empty.

### Verification

Create a pipeline but do not start it: must appear in the overview table with pill `STOPPED`. Start it: pill flips to `RUNNING` on the next 5-second refetch. Stop it: pill flips back. Errored pipelines should still surface via the KPI panel.

## Affected files

```
web/components/forms/DataStoreForm.tsx           (Bug 1)
web/lib/api/endpoints/stores.ts                  (Bug 2)
web/lib/api/endpoints/sources.ts                 (Bug 2)
web/lib/api/endpoints/schemas.ts                 (Bug 2)
web/lib/api/endpoints/pipelines.ts               (Bug 2)
web/lib/api/endpoints/groups.ts                  (Bug 2)
web/lib/hooks/useStores.ts                       (Bug 2)
web/lib/hooks/useSources.ts                      (Bug 2)
web/lib/hooks/useSchemas.ts                      (Bug 2)
web/lib/hooks/usePipelines.ts                    (Bug 2)
web/lib/hooks/useGroups.ts                       (Bug 2)
web/app/(app)/app/page.tsx                       (Bug 3)
```

## Risks

- **Bug 2 fix is type-narrowing**: the `mutateAsync` return type changes from `Entity` to `void`. If anything outside the `new` pages reads the return value, TypeScript will catch it. Implementation step: run `pnpm tsc --noEmit` after the change.
- **Bug 3 fix relies on `usePipelines()` being correct**. It already powers `/pipelines`, which works today, so this is low risk.
- No backend changes, so no migration / API contract churn.
