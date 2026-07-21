import { describe, expect, it } from "vitest";
import { projectTemplates } from "@/app/(app)/pipelines/new/samples";

describe("plantilla de demo", () => {
  it("ofrece una única configuración conectada a los servicios locales", () => {
    expect(projectTemplates).toHaveLength(1);

    const [demo] = projectTemplates;
    expect(demo.source.config).toMatchObject({
      sourceType: "RABBIT_MQ",
      url: "amqp://guest:guest@rabbitmq:5672/%2f",
      queue_name: "iot_bees.demo.telemetry",
    });
    expect(demo.store.config).toMatchObject({
      persistenceType: "WEBHOOK",
      url: "http://demo-sink:8090/events",
    });
  });
});
