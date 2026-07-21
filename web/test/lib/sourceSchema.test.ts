import { describe, expect, it } from "vitest";

import { sourceSchema } from "@/lib/schemas/source";

describe("sourceSchema", () => {
  it("accepts the required configuration for each supported broker", () => {
    const common = { name: "planta-norte", description: "Telemetría de producción" };

    expect(sourceSchema.safeParse({
      ...common,
      config: {
        sourceType: "RABBIT_MQ",
        url: "amqp://rabbitmq:5672",
        queue_name: "telemetry.raw",
        consumer_name: "iot-bees-norte",
      },
    }).success).toBe(true);

    expect(sourceSchema.safeParse({
      ...common,
      config: {
        sourceType: "MQTT",
        broker_url: "mqtt://broker:1883",
        topic: "sensors/#",
        client_id: "iot-bees-norte",
      },
    }).success).toBe(true);

    expect(sourceSchema.safeParse({
      ...common,
      config: {
        sourceType: "KAFKA",
        brokers: "kafka-1:9092, kafka-2:9092",
        topic: "telemetry.raw",
        group_id: "iot-bees-norte",
      },
    }).success).toBe(true);
  });

  it("returns actionable Spanish validation messages", () => {
    const result = sourceSchema.safeParse({
      name: "",
      description: "",
      config: {
        sourceType: "MQTT",
        broker_url: "",
        topic: "",
        client_id: "",
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toEqual(expect.arrayContaining([
        "Ingresa un nombre",
        "Ingresa una descripción",
        "Ingresa la URL del broker MQTT",
        "Ingresa el tópico",
        "Ingresa el ID del cliente",
      ]));
      expect(messages).not.toContain("Ingresa una URL válida");
    }
  });

  it("requires a descriptive name and valid broker URLs", () => {
    const rabbit = sourceSchema.safeParse({
      name: "io",
      description: "Telemetría de producción",
      config: {
        sourceType: "RABBIT_MQ",
        url: "rabbitmq.local:5672",
        queue_name: "telemetry.raw",
        consumer_name: "iot-bees-norte",
      },
    });
    const mqtt = sourceSchema.safeParse({
      name: "planta-norte",
      description: "Telemetría de producción",
      config: {
        sourceType: "MQTT",
        broker_url: "no es una URL",
        topic: "sensors/#",
        client_id: "iot-bees-norte",
      },
    });

    expect(rabbit.success).toBe(false);
    expect(mqtt.success).toBe(false);
    if (!rabbit.success) {
      expect(rabbit.error.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining([
        "El nombre debe tener al menos 3 caracteres",
        "Ingresa una URL válida",
      ]));
    }
    if (!mqtt.success) {
      expect(mqtt.error.issues.map((issue) => issue.message)).toContain("Ingresa una URL válida");
    }
  });
});
