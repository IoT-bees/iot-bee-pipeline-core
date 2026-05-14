// Hand-written types that mirror the backend's OpenAPI shapes.
// Run `pnpm gen:api` to generate types.generated.ts from a running backend.

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
export interface RabbitMqConfig {
  host: string;
  queue: string;
}
export interface MqttConfig {
  host: string;
  topic: string;
}
export interface KafkaConfig {
  brokers: string;
  topic: string;
  group_id: string;
}

export interface DataSource {
  id: number;
  name: string;
  sourceType: SourceType;
  config: RabbitMqConfig | MqttConfig | KafkaConfig;
}

export interface CreateDataSourceRequest {
  name: string;
  sourceType: SourceType;
  config: RabbitMqConfig | MqttConfig | KafkaConfig;
}

export type StoreType = "INFLUX_DB" | "LOCAL_LOG";

export interface DataStore {
  id: number;
  name: string;
  persistenceType: StoreType;
  host?: string;
  database?: string;
  measurement?: string;
  tag_fields?: string[];
  log_name?: string;
}

export type CreateDataStoreRequest = Omit<DataStore, "id">;

export interface PipelineGroup {
  id: number;
  name: string;
}

export interface CreatePipelineGroupRequest {
  name: string;
}

export type FieldType = "float" | "int" | "bool" | "string";
export type Operator = "Add" | "Subtract" | "Multiply" | "Divide";

export interface SchemaOperation {
  operator: Operator;
  operand: number;
}

export interface SchemaField {
  name: string;
  field_type: FieldType;
  required: boolean;
  default?: number | boolean | string;
  min?: number;
  max?: number;
  operations?: SchemaOperation[];
}

export interface ValidationSchema {
  id: number;
  name: string;
  schema: { fields: SchemaField[] };
}

export interface CreateValidationSchemaRequest {
  name: string;
  schema: { fields: SchemaField[] };
}

export interface Pipeline {
  id: number;
  name: string;
  replication: number;
  data_source_id: number | null;
  data_store_id: number | null;
  validation_schema_id: number | null;
  group_id: number | null;
  status?: string;
}

export interface CreatePipelineRequest {
  name: string;
  replication: number;
  data_source_id?: number;
  data_store_id?: number;
  validation_schema_id?: number;
  group_id?: number;
}

export interface PipelineStatus {
  pipeline_id: number;
  pipeline_name: string;
  status: "Running" | "Stopped" | "Error";
  replicas?: number;
}
