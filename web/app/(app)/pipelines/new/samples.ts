import type { SourceInput } from "@/lib/schemas/source";
import type { StoreInput } from "@/lib/schemas/store";
import type { SchemaMap } from "@/lib/api/types";

export interface SamplePipelineConfig {
  source: SourceInput;
  schemaName: string;
  schema: SchemaMap;
  store: StoreInput;
  pipeline: { name: string; replication: number };
}

export const sampleMqttToInfluxConfig: SamplePipelineConfig = {
  source: {
    name: "mqtt-sample",
    description: "sample mqtt broker reading temperature/humidity",
    config: {
      sourceType: "MQTT",
      broker_url: "mqtt://localhost:1883",
      topic: "sensors/temperature/room1",
      client_id: "iot-bees-sample",
    },
  },
  schemaName: "temperature-schema",
  schema: {
    temperature: {
      type: "float",
      required: true,
      default: null,
      validation: { min: -40, max: 85 },
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
  },
  store: {
    name: "influx-sample",
    description: "sample influxdb store for temperature readings",
    config: {
      persistenceType: "INFLUX_DB",
      url: "http://localhost:8086",
      data_base: "sensors",
      measurement: "temperature_readings",
      token: "REPLACE_ME",
      tag_fields: "device_id",
    },
  },
  pipeline: {
    name: "sample-mqtt-pipeline",
    replication: 1,
  },
};
