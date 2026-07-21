import type {
  FlowStageTelemetry,
  ReplicaStatus,
} from "@/lib/api/types";

type FlowStage = "received" | "validated" | "rejected" | "delivered";

const EMPTY_STAGE: FlowStageTelemetry = { count: 0, last_activity_at: null };

function aggregateStage(
  replicas: ReadonlyArray<ReplicaStatus>,
  stage: FlowStage,
): FlowStageTelemetry {
  return replicas.reduce<FlowStageTelemetry>((total, replica) => {
    const current = replica.flow?.[stage] ?? EMPTY_STAGE;
    const lastActivityAt = !total.last_activity_at
      ? current.last_activity_at
      : !current.last_activity_at || new Date(total.last_activity_at) >= new Date(current.last_activity_at)
        ? total.last_activity_at
        : current.last_activity_at;

    return {
      count: total.count + current.count,
      last_activity_at: lastActivityAt,
    };
  }, EMPTY_STAGE);
}

export function summarizeFlowTelemetry(replicas: ReadonlyArray<ReplicaStatus>) {
  const received = aggregateStage(replicas, "received");
  const validated = aggregateStage(replicas, "validated");
  const rejected = aggregateStage(replicas, "rejected");
  const delivered = aggregateStage(replicas, "delivered");

  return {
    received,
    validated,
    rejected,
    delivered,
    successRate: validated.count > 0 ? (delivered.count / validated.count) * 100 : null,
  };
}
