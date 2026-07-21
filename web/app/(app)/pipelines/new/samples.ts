import type { SourceInput } from "@/lib/schemas/source";
import type { StoreInput } from "@/lib/schemas/store";
import type { SchemaMap } from "@/lib/api/types";

export interface SamplePipelineConfig {
  id: string;
  title: string;
  vertical: string;
  description: string;
  source: SourceInput;
  schemaName: string;
  schema: SchemaMap;
  store: StoreInput;
  pipeline: { name: string; replication: number };
}

export const projectTemplates: SamplePipelineConfig[] = [
  {
    id: "live-demo",
    title: "Demo en vivo",
    vertical: "RabbitMQ + webhook local",
    description:
      "Telemetría mock continua para comprobar una conexión, el esquema y el destino con servicios locales.",
    source: {
      name: "demo-rabbitmq-telemetria",
      description: "Cola RabbitMQ local con telemetría mock continua",
      config: {
        sourceType: "RABBIT_MQ",
        url: "amqp://guest:guest@rabbitmq:5672/%2f",
        queue_name: "iot_bees.demo.telemetry",
        consumer_name: "iot-bees-demo",
      },
    },
    schemaName: "demo-telemetria",
    schema: {
      temperature: {
        type: "float",
        required: true,
        default: null,
        validation: { min: -20, max: 70 },
        operation: null,
      },
      humidity: {
        type: "float",
        required: false,
        default: null,
        validation: { min: 0, max: 100 },
        operation: null,
      },
      device_id: {
        type: "string",
        required: true,
        default: null,
        validation: null,
        operation: null,
      },
      event_id: {
        type: "string",
        required: true,
        default: null,
        validation: null,
        operation: null,
      },
      status: {
        type: "string",
        required: true,
        default: null,
        validation: null,
        operation: null,
      },
      note: {
        type: "string",
        required: false,
        default: null,
        validation: null,
        operation: null,
      },
    },
    store: {
      name: "demo-webhook-receptor",
      description: "Receptor local para ver los mensajes validados de la demo",
      config: {
        persistenceType: "WEBHOOK",
        url: "http://demo-sink:8090/events",
        bearer_token: "",
      },
    },
    pipeline: {
      name: "demo-telemetria",
      replication: 1,
    },
  },
];

export const sourceTypeForTemplate = (template: SamplePipelineConfig) =>
  template.source.config.sourceType;
