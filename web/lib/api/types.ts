export interface UserResponse {
  id: number;
  organizationId: number;
  email: string;
  name: string;
  role: string;
  status: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

export interface HasUsersResponse {
  has_users: boolean;
}

export interface MeResponse {
  user: UserResponse;
}

export interface ConnectionType {
  id: number;
  name: string;
}

export type SourceType = "RABBIT_MQ" | "MQTT" | "KAFKA";

export interface RabbitmqConfig {
  url: string;
  queue_name: string;
  consumer_name: string;
}
export interface MqttConfig {
  broker_url: string;
  topic: string;
  client_id: string;
}
export interface KafkaConfig {
  brokers: string[];
  topic: string;
  group_id: string;
}

export type SourceConfigUnion =
  | ({ sourceType: "RABBIT_MQ" } & RabbitmqConfig)
  | ({ sourceType: "MQTT" } & MqttConfig)
  | ({ sourceType: "KAFKA" } & KafkaConfig);

export interface CreateDataSourceRequest {
  name: string;
  dataSourceConfiguration: SourceConfigUnion;
  dataSourceDescription: string;
}

export interface DataSource {
  id: number;
  name: string;
  sourceType: SourceType;
  dataSourceDescription: string;
  config: RabbitmqConfig | MqttConfig | KafkaConfig;
  createdAt?: string;
  updatedAt?: string;
}

export type StoreType = "INFLUX_DB" | "LOCAL_LOG" | "WEBHOOK";

export interface InfluxDbConfig {
  url: string;
  data_base: string;
  measurement: string;
  token: string;
  tag_fields: string[];
}
export interface LocalLogConfig {
  log_name: string;
}
export interface WebhookConfig {
  url: string;
  bearer_token?: string;
}

export type StoreConfigUnion =
  | ({ persistenceType: "INFLUX_DB" } & InfluxDbConfig)
  | ({ persistenceType: "LOCAL_LOG" } & LocalLogConfig)
  | ({ persistenceType: "WEBHOOK" } & WebhookConfig);

export interface CreateDataStoreRequest {
  name: string;
  dataStoreConfiguration: StoreConfigUnion;
  dataStoreDescription: string;
}

export interface DataStore {
  id: number;
  name: string;
  storeType: StoreType;
  dataStoreDescription: string;
  config: InfluxDbConfig | LocalLogConfig | WebhookConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectionTestResponse {
  ok: boolean;
  message: string;
}

export interface PipelineGroup {
  id: number;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePipelineGroupRequest {
  name: string;
  description: string;
}

export type FieldType = "float" | "int" | "bool" | "string";

export interface ValidationRule {
  min?: number;
  max?: number;
}

export interface FieldSchema {
  type: FieldType;
  required: boolean;
  default?: number | boolean | string | null;
  validation?: ValidationRule | null;
  operation?: Record<string, unknown> | null;
}

export type SchemaMap = Record<string, FieldSchema>;

export interface ValidationSchema {
  id: number;
  name: string;
  schema: SchemaMap;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateValidationSchemaRequest {
  name: string;
  schema: SchemaMap;
}

interface NestedRef {
  id: number;
  name: string;
}

export interface Pipeline {
  id: number;
  name: string;
  isActive: boolean;
  dataStore: NestedRef & { storeType?: string };
  pipelineGroup: NestedRef;
  dataSource: NestedRef & { sourceType?: string };
  dataValidationSchema: NestedRef;
  replicationFactor: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePipelineRequest {
  name: string;
  dataStoreId: number;
  pipelineGroupId: number;
  dataSourceId: number;
  validationSchemaId: number;
  dataStoreDescription: string;
  pipelineReplication: number;
}

export interface ReplicaStatus {
  replica_id: number;
  status: string;
  last_processed_at: string | null;
  last_error: string | null;
  flow?: ReplicaFlowTelemetry;
}

export interface FlowStageTelemetry {
  count: number;
  last_activity_at: string | null;
}

export interface ReplicaFlowTelemetry {
  received: FlowStageTelemetry;
  validated: FlowStageTelemetry;
  rejected: FlowStageTelemetry;
  delivered: FlowStageTelemetry;
}

export interface PipelineStatus {
  pipeline_id: number;
  pipeline_name: string;
  pipeline_general_status: string;
  replica_statuses: Record<string, string>;
  replicas: ReplicaStatus[];
}

export interface PlanLimits {
  maxPipelines: number;
  maxReplicasPerPipeline: number;
  includedMessagesMonthly: number;
  alertsEnabled: boolean;
  premiumConnectors: boolean;
  multiUser: boolean;
}

export interface LicenseUsage {
  pipelines: number;
}

export interface LicenseStatus {
  plan: "free" | "starter" | "pro" | "enterprise";
  state: "active" | "inactive" | "expired";
  limits: PlanLimits;
  usage: LicenseUsage;
  licenseKeyLast4: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  stripePaymentStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  latestInvoiceId: string | null;
  amountCents: number | null;
  currency: string | null;
  planSource: "catalog" | "fallback-enum";
  isRestricted: boolean;
}

export interface UsageStatus {
  organizationId: number;
  pipelineId: number | null;
  cycleStart: string;
  cycleEnd: string;
  includedMessages: number;
  consumedMessages: number;
  percentage: number;
  quotaState: "available" | "warning" | "exhausted";
  messagesReceived: number;
  messagesValidated: number;
  messagesDelivered: number;
  messagesFailed: number;
  bytesIn: number;
  bytesOut: number;
}

export interface ActivateLicenseRequest {
  licenseKey: string;
}

// === Admin panel ===

export interface AuditEvent {
  id: number;
  organizationId: number | null;
  userId: number | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditListResponse {
  items: AuditEvent[];
  nextCursor: number | null;
}

export interface AuditFilters {
  userId?: number;
  method?: string;
  pathContains?: string;
  status?: number;
  from?: string;
  to?: string;
  cursor?: number;
  limit?: number;
}

export interface Dependency {
  name: string;
  configured: boolean;
  ok: boolean;
  latencyMs: number | null;
  error: string | null;
}

export interface SystemStatus {
  probedAt: string;
  dependencies: Dependency[];
  runtime: {
    configuredPipelines: number;
    liveReplicas: number | null;
    msgsLastHour: number | null;
  };
  build: { commit: string; buildTime: string; uptimeSeconds: number };
}

export interface ContactSettings {
  contactEmail: string;
  whatsappNumber: string | null;
}

export interface UpdateContactSettingsRequest {
  contactEmail: string;
  whatsappNumber: string | null;
}

export interface AdminUser {
  id: number;
  organizationId: number;
  email: string;
  name: string;
  role: "admin" | "operator" | "viewer";
  status: "active" | "disabled";
  mustResetPassword: boolean;
  createdAt: string;
}

export interface AdminUsersListResponse {
  items: AdminUser[];
  nextCursor: number | null;
}

export interface AdminUsersFilters {
  cursor?: number;
  limit?: number;
  q?: string;
  status?: "active" | "disabled";
}

export interface CreateAdminUserRequest {
  email: string;
  name: string;
  role: "admin" | "operator" | "viewer";
  tempPassword: string;
}

export interface PatchAdminUserRequest {
  name?: string;
  role?: "admin" | "operator" | "viewer";
  status?: "active" | "disabled";
  mustResetPassword?: boolean;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatchOrganizationRequest {
  name?: string;
  slug?: string;
}

export interface Plan {
  id: number;
  slug: string;
  organizationId: number | null;
  displayName: string;
  description: string | null;
  priceCents: number;
  currency: string;
  maxPipelines: number;
  maxReplicasPerPipeline: number;
  includedMessagesMonthly: number;
  alertsEnabled: boolean;
  premiumConnectors: boolean;
  multiUser: boolean;
  isCustom: boolean;
  stripePriceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanListResponse { items: Plan[] }

export interface CreatePlanRequest {
  slug: string;
  organizationId?: number | null;
  displayName: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  maxPipelines: number;
  maxReplicasPerPipeline: number;
  includedMessagesMonthly: number;
  alertsEnabled?: boolean;
  premiumConnectors?: boolean;
  multiUser?: boolean;
  isCustom?: boolean;
  stripePriceId?: string | null;
}

export interface PatchPlanRequest {
  displayName?: string;
  description?: string | null;
  priceCents?: number;
  currency?: string;
  maxPipelines?: number;
  maxReplicasPerPipeline?: number;
  includedMessagesMonthly?: number;
  alertsEnabled?: boolean;
  premiumConnectors?: boolean;
  multiUser?: boolean;
  stripePriceId?: string | null;
}

export interface BillingEvent {
  id: number;
  stripeEventId: string;
  eventType: string;
  payload: string;
  createdAt: string;
  processedOk: boolean;
  lastError: string | null;
}

export interface BillingEventsListResponse {
  items: BillingEvent[];
  nextCursor: number | null;
}

export interface PipelineStateRow {
  id: number;
  name: string;
  status: string;
}

export interface OrgStateResponse {
  org: Organization;
  license: {
    plan: string;
    state: string;
    licenseKeyLast4: string | null;
    expiresAt: string | null;
    stripeSubscriptionStatus: string | null;
    isRestricted: boolean;
    planSource: string;
    usage: { pipelines: number };
    limits: {
      maxPipelines: number;
      maxReplicasPerPipeline: number;
      alertsEnabled: boolean;
      premiumConnectors: boolean;
      multiUser: boolean;
    };
  };
  pipelines: PipelineStateRow[];
  recentAudit: AuditEvent[];
}
