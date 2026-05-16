export type PaidPlan = "starter" | "pro" | "enterprise";

export interface BillingPlan {
  id: PaidPlan;
  name: string;
  priceUsd: string;
  licensePrefix: string;
  description: string;
  maxPipelines: number;
  maxReplicasPerPipeline: number;
  alertsEnabled: boolean;
  premiumConnectors: boolean;
  multiUser: boolean;
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceUsd: "5.00",
    licensePrefix: "IOTBEE-STARTER",
    description: "Small deployments and paid pilots.",
    maxPipelines: 10,
    maxReplicasPerPipeline: 4,
    alertsEnabled: false,
    premiumConnectors: false,
    multiUser: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceUsd: "15.00",
    licensePrefix: "IOTBEE-PRO",
    description: "Production teams with more pipelines and replicas.",
    maxPipelines: 50,
    maxReplicasPerPipeline: 16,
    alertsEnabled: true,
    premiumConnectors: true,
    multiUser: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceUsd: "49.00",
    licensePrefix: "IOTBEE-ENTERPRISE",
    description: "Larger sites, premium capabilities and support.",
    maxPipelines: 250,
    maxReplicasPerPipeline: 64,
    alertsEnabled: true,
    premiumConnectors: true,
    multiUser: true,
  },
];

export function findBillingPlan(planId: string): BillingPlan | undefined {
  return BILLING_PLANS.find((plan) => plan.id === planId);
}
