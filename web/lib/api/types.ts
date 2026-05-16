export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: string;
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

export type StoreType = "INFLUX_DB" | "LOCAL_LOG";

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

export type StoreConfigUnion =
  | ({ persistenceType: "INFLUX_DB" } & InfluxDbConfig)
  | ({ persistenceType: "LOCAL_LOG" } & LocalLogConfig);

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
  config: InfluxDbConfig | LocalLogConfig;
  createdAt?: string;
  updatedAt?: string;
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

export interface PipelineStatus {
  pipeline_id: number;
  pipeline_name: string;
  pipeline_general_status: string;
  replica_statuses: Record<string, string>;
}

export interface PlanLimits {
  maxPipelines: number;
  maxReplicasPerPipeline: number;
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
}

export interface ActivateLicenseRequest {
  licenseKey: string;
}
