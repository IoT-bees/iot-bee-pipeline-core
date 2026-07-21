"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Circle,
  Eye,
  Plus,
  RefreshCw,
} from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { PipelineActions } from "@/components/pipelines/PipelineActions";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { pipelinesApi } from "@/lib/api/endpoints/pipelines";
import { sourcesApi } from "@/lib/api/endpoints/sources";
import { storesApi } from "@/lib/api/endpoints/stores";
import { schemasApi } from "@/lib/api/endpoints/schemas";
import { groupsApi } from "@/lib/api/endpoints/groups";
import { fmtId } from "@/lib/fmt";
import { summarizeFlowTelemetry } from "@/lib/flowTelemetry";
import { isDegraded, isHealthy, toPillState } from "@/lib/status";
import type {
  DataSource,
  DataStore,
  Pipeline,
  PipelineGroup,
  ValidationSchema,
} from "@/lib/api/types";

const PROJECTS_PER_PAGE = 10;

interface OnboardingStep {
  href: string;
  num: string;
  title: string;
  why: string;
  done: boolean;
}

type OnboardingState = "completed" | "current" | "pending";

function formatLastUpdate(updatedAt: number, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - updatedAt) / 1000));

  if (elapsedSeconds < 10) return "Actualizado ahora";
  if (elapsedSeconds < 60) return `Actualizado hace ${elapsedSeconds} s`;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `Actualizado hace ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `Actualizado hace ${elapsedHours} h`;
}

function withCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function projectStatusLabel(status?: string) {
  switch ((status ?? "STOPPED").toUpperCase()) {
    case "HEALTHY":
      return "OPERATIVO";
    case "DEGRADED":
      return "CON INCIDENCIAS";
    case "IDLE":
      return "EN ESPERA";
    default:
      return "DETENIDO";
  }
}

function OnboardingCard({
  step,
  state,
}: {
  step: OnboardingStep;
  state: OnboardingState;
}) {
  const completed = state === "completed";
  const current = state === "current";

  return (
    <Link
      href={step.href}
      className={`block rounded-[3px] border p-4 transition-colors ${
        completed
          ? "border-[var(--color-accent)] bg-[var(--color-bg-panel)]"
          : current
            ? "border-[var(--color-accent)] bg-[var(--color-bg-elev)]"
            : "border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] hover:border-[var(--color-accent)]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[18px] font-bold text-[var(--color-accent)]">
          {step.num}
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase ${
          completed || current
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-fg-4)]"
        }`}>
          {completed ? <Check size={14} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}
          {completed ? "Listo" : current ? "Sigue aquí" : "Pendiente"}
        </span>
      </div>
      <div className="mb-1 font-bold text-[16px] text-[var(--color-fg-0)]">
        {step.title}
      </div>
      <div className="text-[14px] leading-[1.5] text-[var(--color-fg-2)]">
        {step.why}
      </div>
    </Link>
  );
}

function MetricValue({
  value,
  detail,
  compactDetail,
}: {
  value: number | string;
  detail: string;
  compactDetail?: string;
}) {
  return (
    <>
      <div className="t-title mt-1 tabular-nums">{value}</div>
      <p className="mt-1 text-[13px] leading-5 text-[var(--color-fg-3)]">
        {compactDetail ? (
          <>
            <span className="xl:hidden">{detail}</span>
            <span className="hidden xl:inline" title={detail}>
              {compactDetail}
            </span>
          </>
        ) : (
          detail
        )}
      </p>
    </>
  );
}

function ProjectStatusPill({
  status,
  isPending,
  isError,
}: {
  status?: string;
  isPending: boolean;
  isError: boolean;
}) {
  if (isError) {
    return <Pill state="error">NO DISPONIBLE</Pill>;
  }

  if (isPending) {
    return <Pill state="starting">ACTUALIZANDO</Pill>;
  }

  return (
    <Pill state={toPillState(status)}>
      {projectStatusLabel(status)}
    </Pill>
  );
}

interface DashboardInitial {
  pipelines?: Pipeline[];
  sources?: DataSource[];
  stores?: DataStore[];
  schemas?: ValidationSchema[];
  groups?: PipelineGroup[];
}

export function AppDashboardClient({ initial = {} }: { initial?: DashboardInitial }) {
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [refreshClock, setRefreshClock] = useState(0);
  const [projectPage, setProjectPage] = useState(1);
  const {
    data: status,
    isPending: statusPending,
    isFetching: statusFetching,
    isError: statusError,
    refetch: refetchStatus,
  } = usePipelineStatusAll();
  const pipesQ = useQuery({
    queryKey: ["pipelines", "list"],
    queryFn: pipelinesApi.list,
    initialData: initial.pipelines,
    staleTime: 15_000,
  });
  const sourcesQ = useQuery({
    queryKey: ["sources"],
    queryFn: sourcesApi.list,
    initialData: initial.sources,
    staleTime: 30_000,
  });
  const storesQ = useQuery({
    queryKey: ["stores"],
    queryFn: storesApi.list,
    initialData: initial.stores,
    staleTime: 30_000,
  });
  const schemasQ = useQuery({
    queryKey: ["schemas"],
    queryFn: schemasApi.list,
    initialData: initial.schemas,
    staleTime: 30_000,
  });
  const groupsQ = useQuery({
    queryKey: ["groups"],
    queryFn: groupsApi.list,
    initialData: initial.groups,
    staleTime: 30_000,
  });

  const isLoading = pipesQ.isPending;
  const isRefreshingProjects = isManuallyRefreshing || statusFetching || pipesQ.isFetching;
  const lastTableUpdateLabel = pipesQ.dataUpdatedAt
    ? formatLastUpdate(pipesQ.dataUpdatedAt, refreshClock || pipesQ.dataUpdatedAt)
    : "Sin actualizar";

  useEffect(() => {
    function updateClock() {
      setRefreshClock(Date.now());
    }

    updateClock();
    const intervalId = window.setInterval(updateClock, 15_000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function refreshProjectTable() {
    setIsManuallyRefreshing(true);
    const startedAt = Date.now();

    try {
      await Promise.all([pipesQ.refetch(), refetchStatus()]);
    } finally {
      const remainingFeedbackMs = Math.max(0, 400 - (Date.now() - startedAt));
      if (remainingFeedbackMs) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingFeedbackMs));
      }
      setIsManuallyRefreshing(false);
    }
  }

  const statusByPid = new Map(
    (status ?? []).map((s) => [s.pipeline_id, s.pipeline_general_status]),
  );
  const telemetryByPid = new Map(
    (status ?? []).map((s) => [s.pipeline_id, summarizeFlowTelemetry(s.replicas ?? [])]),
  );
  const list = (pipesQ.data ?? []).map((p) => ({
    pipeline_id: p.id,
    pipeline_name: p.name,
    pipeline_general_status: statusByPid.get(p.id),
    telemetry: telemetryByPid.get(p.id),
  }));
  const projectPageCount = Math.max(1, Math.ceil(list.length / PROJECTS_PER_PAGE));
  const currentProjectPage = Math.min(projectPage, projectPageCount);
  const visibleProjects = list.slice(
    (currentProjectPage - 1) * PROJECTS_PER_PAGE,
    currentProjectPage * PROJECTS_PER_PAGE,
  );

  useEffect(() => {
    if (projectPage > projectPageCount) setProjectPage(projectPageCount);
  }, [projectPage, projectPageCount]);

  const running = list.filter((p) => isHealthy(p.pipeline_general_status)).length;
  const errored = list.filter((p) => isDegraded(p.pipeline_general_status)).length;
  const total = list.length;
  const hasProjectData = pipesQ.data !== undefined;

  const resourcesAreLoading =
    sourcesQ.isPending || storesQ.isPending || schemasQ.isPending || groupsQ.isPending;
  const resourcesHaveError =
    sourcesQ.isError || storesQ.isError || schemasQ.isError || groupsQ.isError;
  const resourcesReady = !resourcesAreLoading && !resourcesHaveError;
  const sourcesCount = sourcesQ.data?.length ?? 0;
  const storesCount = storesQ.data?.length ?? 0;
  const schemasCount = schemasQ.data?.length ?? 0;
  const groupsCount = groupsQ.data?.length ?? 0;

  const setupReady = hasProjectData && !pipesQ.isError && resourcesReady;

  const onboarding: OnboardingStep[] = [
    {
      href: "/sources/new",
      num: "01",
      title: "Conecta el broker del cliente",
      why: "Conecta RabbitMQ, MQTT o Kafka.",
      done: sourcesCount > 0,
    },
    {
      href: "/schemas/new",
      num: "02",
      title: "Define los datos y sus reglas",
      why: "Define campos y reglas de validación.",
      done: schemasCount > 0,
    },
    {
      href: "/stores/new",
      num: "03",
      title: "Agrega el destino",
      why: "Elige dónde entregar los datos validados.",
      done: storesCount > 0,
    },
    {
      href: "/pipelines/new",
      num: "04",
      title: "Crea el proyecto",
      why: "Une la conexión, las reglas y el destino.",
      done: total > 0,
    },
  ];
  const completed = onboarding.filter((s) => s.done).length;
  const onboardingDone = completed === onboarding.length;
  const currentStep = onboarding.findIndex((step) => !step.done);
  const nextOnboardingStep = onboarding[currentStep];
  const primaryAction = onboardingDone
    ? { href: "/pipelines/new", label: "Crear proyecto" }
    : nextOnboardingStep
      ? { href: nextOnboardingStep.href, label: `Completar paso ${nextOnboardingStep.num}` }
      : { href: "/sources/new", label: "Configurar proyecto" };
  const resourceDetail = resourcesAreLoading
    ? "Actualizando recursos"
    : resourcesHaveError
      ? "No se pudieron cargar"
      : [
          withCount(sourcesCount, "broker", "brokers"),
          withCount(storesCount, "destino", "destinos"),
          withCount(schemasCount, "regla", "reglas"),
          withCount(groupsCount, "grupo", "grupos"),
        ].join(" · ");
  const configuredResourceCategories = [
    sourcesCount,
    storesCount,
    schemasCount,
    groupsCount,
  ].filter((count) => count > 0).length;
  const resourceCompactDetail = resourcesReady
    ? configuredResourceCategories === 0
      ? "Sin recursos configurados"
      : `En ${configuredResourceCategories} ${
          configuredResourceCategories === 1 ? "categoría" : "categorías"
        }`
    : resourceDetail;
  const projectLabel = total === 1 ? "proyecto" : "proyectos";
  const runningDetail =
    statusPending
      ? "Actualizando estado"
      : statusError
        ? "Estado no disponible"
        : total === 0
          ? "Aún no hay proyectos"
          : `de ${total} ${projectLabel}`;
  const attentionDetail =
    statusPending
      ? "Actualizando estado"
      : statusError
        ? "Estado no disponible"
        : errored === 0
          ? "Sin incidencias activas"
          : `${errored} ${errored === 1 ? "proyecto degradado" : "proyectos degradados"}`;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
        <div className="max-w-2xl">
          <p className="t-section mb-2">Resumen operativo</p>
          <h1 className="t-title">Panel de proyectos</h1>
          <p className="mt-2 text-[15px] leading-6 text-[var(--color-fg-2)]">
            Revisa el estado y atiende incidencias.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href={primaryAction.href} className="w-full sm:w-auto">
            <Button variant="primary" className="min-h-11 w-full gap-2 sm:w-auto">
              <Plus size={17} aria-hidden="true" />
              {primaryAction.label}
            </Button>
          </Link>
          {total > 0 && (
            <Link href="/pipelines" className="w-full sm:w-auto">
              <Button variant="ghost" className="min-h-11 w-full gap-2 sm:w-auto">
                Ver proyectos <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </Link>
          )}
        </div>
      </div>
      {pipesQ.isError && !hasProjectData ? (
        <div role="alert" className="mb-8">
        <Panel tone="danger">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-[var(--color-danger)]" size={20} aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-[var(--color-fg-0)]">No pudimos cargar los proyectos</h2>
                <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">Reintenta para consultar la información más reciente.</p>
              </div>
            </div>
            <Button type="button" variant="ghost" className="min-h-10 gap-2" onClick={() => void refreshProjectTable()}>
              <RefreshCw size={16} aria-hidden="true" /> Reintentar
            </Button>
          </div>
        </Panel>
        </div>
      ) : (
        <>
          {pipesQ.isError && (
            <div className="mb-5" role="alert">
              <Panel tone="danger">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className="mt-0.5 shrink-0 text-[var(--color-danger)]"
                      size={20}
                      aria-hidden="true"
                    />
                    <div>
                      <h2 className="font-semibold text-[var(--color-fg-0)]">
                        No pudimos actualizar los proyectos
                      </h2>
                      <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">
                        Mostramos la última información disponible mientras reintentas.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-10 gap-2"
                    onClick={() => void refreshProjectTable()}
                  >
                    <RefreshCw size={16} aria-hidden="true" /> Reintentar
                  </Button>
                </div>
              </Panel>
            </div>
          )}
          {statusError && total > 0 && (
            <div className="mb-5" role="status" aria-live="polite">
            <Panel tone="danger">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0 text-[var(--color-danger)]" size={20} aria-hidden="true" />
                  <div>
                    <h2 className="font-semibold text-[var(--color-fg-0)]">Estado operativo no disponible</h2>
                    <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">Tus proyectos se muestran, pero no podemos confirmar si están en ejecución.</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" className="min-h-10 gap-2" onClick={() => void refetchStatus()}>
                  <RefreshCw size={16} aria-hidden="true" /> Reintentar
                </Button>
              </div>
            </Panel>
            </div>
          )}
          {resourcesHaveError && (
            <div className="mb-5" role="status" aria-live="polite">
            <Panel>
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-[var(--color-warn)]" size={19} aria-hidden="true" />
                <p className="text-[14px] text-[var(--color-fg-2)]">No pudimos cargar todos los recursos reutilizables. Las métricas incompletas se indican como no disponibles.</p>
              </div>
            </Panel>
            </div>
          )}
      {setupReady && !onboardingDone && (
        <section className="mb-8" aria-labelledby="onboarding-title">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 id="onboarding-title" className="t-section">Primer proyecto</h2>
              <p className="mt-1 text-[14px] text-[var(--color-fg-2)]">Completa estos pasos para poner en marcha tu primer flujo.</p>
            </div>
            <span className="rounded-[2px] border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-fg-3)] font-mono">
              {completed} de {onboarding.length} pasos completados
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {onboarding.map((step, index) => (
              <OnboardingCard
                key={step.num}
                step={step}
                state={step.done ? "completed" : index === currentStep ? "current" : "pending"}
              />
            ))}
          </div>
        </section>
      )}

      {statusPending || errored > 0 ? (
        <section className="mb-5" aria-live="polite">
          {statusPending ? (
            <div className="flex items-center gap-2 rounded-[3px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-3 text-[14px] text-[var(--color-fg-2)]">
              <RefreshCw size={17} className="animate-spin text-[var(--color-accent-strong)]" aria-hidden="true" />
              Actualizando el estado operativo de los proyectos…
            </div>
          ) : errored > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-[var(--color-danger)] bg-[var(--color-bg-panel)] px-4 py-3">
              <div className="flex items-center gap-2 text-[14px] text-[var(--color-fg-1)]">
                <AlertTriangle size={18} className="text-[var(--color-danger)]" aria-hidden="true" />
                <span><strong>{errored}</strong> {errored === 1 ? "proyecto requiere" : "proyectos requieren"} atención.</span>
              </div>
              <Link href="/pipelines" className="text-[13px] font-semibold text-[var(--color-danger)] hover:underline">Revisar proyectos</Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="operation-title">
      <h2 id="operation-title" className="t-section mb-3">Operación</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
        <Panel>
          <div className="t-label">Proyectos en ejecución</div>
          <MetricValue
            value={statusPending || statusError ? "—" : running}
            detail={runningDetail}
          />
        </Panel>
        <Panel>
          <div className="t-label">Proyectos con incidencias</div>
          <MetricValue
            value={statusPending || statusError ? "—" : errored}
            detail={attentionDetail}
          />
        </Panel>
        <Panel>
          <div className="t-label">Proyectos creados</div>
          <MetricValue
            value={pipesQ.isPending ? "—" : total}
            detail={
              pipesQ.isPending
                ? "Cargando proyectos"
                : pipesQ.isError
                  ? "Última información disponible"
                  : total === 1
                    ? "Proyecto configurado"
                    : "Proyectos configurados"
            }
          />
        </Panel>
        <Panel>
          <div className="t-label">Recursos configurados</div>
          <MetricValue
            value={resourcesReady ? sourcesCount + storesCount + schemasCount + groupsCount : "—"}
            detail={resourceDetail}
            compactDetail={resourceCompactDetail}
          />
        </Panel>
      </div>
      </section>
        </>
      )}

      {hasProjectData && (
        <>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="t-section">Estado de proyectos</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refreshProjectTable()}
            disabled={isManuallyRefreshing}
            aria-busy={isManuallyRefreshing}
            className="min-h-10 gap-2"
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={isRefreshingProjects ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
          <Link href="/pipelines">
            <Button variant="ghost" size="sm" className="min-h-10 gap-2">
              Ver todos <Eye size={16} aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
      {isLoading ? (
        <HoneycombLoader label="Cargando proyectos" />
      ) : list.length === 0 ? (
        <Panel className="text-center">
          <h3 className="font-semibold text-[var(--color-fg-0)]">
            Aún no hay proyectos creados
          </h3>
          <p className="t-mono mt-2">
            {onboardingDone
              ? "Usa la acción principal para crear tu primer proyecto."
              : "Completa los pasos de configuración para crear el primero."}
          </p>
        </Panel>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TH>#</TH>
                <TH>PROYECTO</TH>
                <TH>ESTADO</TH>
                <TH>ACTIVIDAD</TH>
                <TH className="text-right">ACCIONES</TH>
              </THead>
              <tbody>
                {visibleProjects.map((p) => (
                  <TR key={p.pipeline_id}>
                    <TD>{fmtId(p.pipeline_id)}</TD>
                    <TD>
                      <Link
                        href={`/pipelines/${p.pipeline_id}`}
                        className="hover:text-[var(--color-accent)]"
                      >
                        {p.pipeline_name}
                      </Link>
                    </TD>
                    <TD>
                      <ProjectStatusPill
                        status={p.pipeline_general_status}
                        isPending={statusPending}
                        isError={statusError}
                      />
                    </TD>
                    <TD>
                      <FlowSummary
                        telemetry={p.telemetry}
                        isPending={statusPending}
                        isError={statusError}
                      />
                    </TD>
                    <TD className="text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Link href={`/pipelines/${p.pipeline_id}`}>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </Link>
                        <PipelineActions
                          id={p.pipeline_id}
                          name={p.pipeline_name}
                          status={p.pipeline_general_status}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <ProjectTableFooter
              currentPage={currentProjectPage}
              pageCount={projectPageCount}
              totalProjects={total}
              lastUpdateLabel={lastTableUpdateLabel}
              onPageChange={setProjectPage}
            />
          </div>
          <div className="md:hidden flex flex-col gap-2">
            {visibleProjects.map((p) => (
              <Panel key={p.pipeline_id}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="t-label">
                      {"// "}#{fmtId(p.pipeline_id)}
                    </div>
                    <Link
                      href={`/pipelines/${p.pipeline_id}`}
                      className="font-bold hover:text-[var(--color-accent)]"
                    >
                      {p.pipeline_name}
                    </Link>
                  </div>
                  <ProjectStatusPill
                    status={p.pipeline_general_status}
                    isPending={statusPending}
                    isError={statusError}
                  />
                </div>
                <div className="mb-3 border-y border-[var(--color-border-subtle)] py-2">
                  <FlowSummary
                    telemetry={p.telemetry}
                    isPending={statusPending}
                    isError={statusError}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/pipelines/${p.pipeline_id}`}>
                    <Button variant="ghost" size="sm">Ver</Button>
                  </Link>
                  <PipelineActions
                    id={p.pipeline_id}
                    name={p.pipeline_name}
                    status={p.pipeline_general_status}
                  />
                </div>
              </Panel>
            ))}
            <ProjectTableFooter
              currentPage={currentProjectPage}
              pageCount={projectPageCount}
              totalProjects={total}
              lastUpdateLabel={lastTableUpdateLabel}
              onPageChange={setProjectPage}
            />
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}

function ProjectTableFooter({
  currentPage,
  pageCount,
  totalProjects,
  lastUpdateLabel,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  totalProjects: number;
  lastUpdateLabel: string;
  onPageChange: (page: number) => void;
}) {
  const firstProject = (currentPage - 1) * PROJECTS_PER_PAGE + 1;
  const lastProject = Math.min(currentPage * PROJECTS_PER_PAGE, totalProjects);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[var(--color-fg-3)]">
          {firstProject}–{lastProject} de {totalProjects}
        </span>
        {pageCount > 1 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Anterior
            </Button>
            <span className="text-[11px] text-[var(--color-fg-3)]" aria-live="polite">
              Página {currentPage} de {pageCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage === pageCount}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Siguiente
            </Button>
          </>
        )}
      </div>
      <span className="text-[11px] text-[var(--color-fg-4)]" aria-live="polite">
        {lastUpdateLabel}
      </span>
    </div>
  );
}

function FlowSummary({
  telemetry,
  isPending,
  isError,
}: {
  telemetry: ReturnType<typeof summarizeFlowTelemetry> | undefined;
  isPending: boolean;
  isError: boolean;
}) {
  if (isError) {
    return <span className="text-[12px] text-[var(--color-danger)]">Actividad no disponible</span>;
  }

  if (isPending) {
    return <span className="text-[12px] text-[var(--color-fg-3)]">Actualizando actividad…</span>;
  }

  if (!telemetry || telemetry.received.count === 0) {
    return <span className="text-[12px] text-[var(--color-fg-4)]">Sin mensajes aún</span>;
  }

  const formatter = new Intl.NumberFormat("es-CO");
  const successRate = telemetry.successRate;

  return (
    <div className="min-w-[180px] text-[12px] leading-5 text-[var(--color-fg-2)]">
      <div className="font-semibold text-[var(--color-fg-1)]">
        {formatter.format(telemetry.validated.count)} procesados · {formatter.format(telemetry.delivered.count)} entregados
      </div>
      <div className={successRate === 100 ? "text-[var(--color-online)]" : "text-[var(--color-fg-3)]"}>
        {successRate === null
          ? "Entrega por confirmar"
          : `${successRate.toLocaleString("es-CO", { maximumFractionDigits: 1 })}% éxito de entrega`}
      </div>
    </div>
  );
}
