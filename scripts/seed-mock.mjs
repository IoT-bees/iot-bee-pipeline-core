#!/usr/bin/env node
// Seed mock data into the iot bees backend via REST API.
// Idempotent — running twice does not duplicate records.
//
// Usage:
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node scripts/seed-mock.mjs
//
// Optional env:
//   API_URL    Backend base URL (default http://localhost:8080)

const API = process.env.API_URL || "http://localhost:8080";
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("× ADMIN_EMAIL and ADMIN_PASSWORD env vars are required.");
  console.error(
    "  example: ADMIN_EMAIL=admin@iot-bee.local ADMIN_PASSWORD=... node scripts/seed-mock.mjs",
  );
  process.exit(1);
}

let TOKEN = "";

async function req(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, ok: res.ok, body: parsed };
}

function fail(msg, r) {
  throw new Error(
    `${msg} (status=${r.status}): ${typeof r.body === "string" ? r.body : JSON.stringify(r.body)}`,
  );
}

async function login() {
  const r = await req("POST", "/auth/login", { email: EMAIL, password: PASSWORD });
  if (!r.ok) fail("login failed", r);
  TOKEN = r.body.token;
  console.log(`✓ logged in as ${r.body.user.email} (org=${r.body.user.organizationId})`);
}

async function findByName(listPath, name) {
  const r = await req("GET", listPath);
  if (!r.ok) fail(`GET ${listPath}`, r);
  return (r.body || []).find((e) => e.name === name);
}

async function ensureGroup(name, description) {
  const found = await findByName("/pipeline-groups", name);
  if (found) {
    console.log(`  · group exists: ${name} (#${found.id})`);
    return found.id;
  }
  const r = await req("POST", "/pipeline-groups", { name, description });
  if (!r.ok) fail(`create group ${name}`, r);
  const created = await findByName("/pipeline-groups", name);
  console.log(`  + group created: ${name} (#${created.id})`);
  return created.id;
}

async function ensureSource(name, description, configuration) {
  const found = await findByName("/data-sources", name);
  if (found) {
    console.log(`  · source exists: ${name} (#${found.id})`);
    return found.id;
  }
  const r = await req("POST", "/data-sources", {
    name,
    dataSourceConfiguration: configuration,
    dataSourceDescription: description,
  });
  if (!r.ok) fail(`create source ${name}`, r);
  const created = await findByName("/data-sources", name);
  console.log(`  + source created: ${name} (#${created.id})`);
  return created.id;
}

async function ensureStore(name, description, configuration) {
  const found = await findByName("/data-stores", name);
  if (found) {
    console.log(`  · store exists: ${name} (#${found.id})`);
    return found.id;
  }
  const r = await req("POST", "/data-stores", {
    name,
    dataStoreConfiguration: configuration,
    dataStoreDescription: description,
  });
  if (!r.ok) fail(`create store ${name}`, r);
  const created = await findByName("/data-stores", name);
  console.log(`  + store created: ${name} (#${created.id})`);
  return created.id;
}

async function ensureSchema(name, schema) {
  const found = await findByName("/validation-schemas", name);
  if (found) {
    console.log(`  · schema exists: ${name} (#${found.id})`);
    return found.id;
  }
  const r = await req("POST", "/validation-schemas", { name, schema });
  if (!r.ok) fail(`create schema ${name}`, r);
  const created = await findByName("/validation-schemas", name);
  console.log(`  + schema created: ${name} (#${created.id})`);
  return created.id;
}

async function ensurePipeline(payload) {
  const found = await findByName("/pipelines", payload.name);
  if (found) {
    console.log(`  · pipeline exists: ${payload.name} (#${found.id})`);
    return found.id;
  }
  const r = await req("POST", "/pipelines", payload);
  if (r.status === 402) {
    console.log(`  ! skipped ${payload.name}: ${r.body?.error ?? "plan limit"}`);
    return null;
  }
  if (!r.ok) fail(`create pipeline ${payload.name}`, r);
  const created = await findByName("/pipelines", payload.name);
  console.log(`  + pipeline created: ${payload.name} (#${created.id})`);
  return created.id;
}

// helpers for schema fields
const f = {
  float: (opts = {}) => ({
    type: "float",
    required: opts.required ?? true,
    default: opts.default ?? null,
    validation:
      opts.min !== undefined || opts.max !== undefined
        ? { min: opts.min, max: opts.max }
        : null,
    operation: opts.operation ?? null,
  }),
  int: (opts = {}) => ({
    type: "int",
    required: opts.required ?? true,
    default: opts.default ?? null,
    validation:
      opts.min !== undefined || opts.max !== undefined
        ? { min: opts.min, max: opts.max }
        : null,
    operation: null,
  }),
  string: (opts = {}) => ({
    type: "string",
    required: opts.required ?? false,
    default: opts.default ?? null,
    validation: null,
    operation: null,
  }),
  bool: (opts = {}) => ({
    type: "bool",
    required: opts.required ?? false,
    default: opts.default ?? null,
    validation: null,
    operation: null,
  }),
};

const v = (name) => ({ type: "var", name });
const mul = (left, right) => ({ type: "bin_op", op: "Mul", left, right });

async function main() {
  console.log(`→ API: ${API}`);
  await login();

  console.log("\n[groups]");
  const groups = {
    buildingA: await ensureGroup(
      "building-a-sensors",
      "Building A — temperature, humidity, pressure sensors across floors 1–4.",
    ),
    labFloor: await ensureGroup(
      "lab-floor",
      "Research lab environmental monitoring + vibration testbench.",
    ),
    warehouse: await ensureGroup(
      "warehouse-rfid",
      "Warehouse RFID gate readers and conveyor scales.",
    ),
  };

  console.log("\n[sources]");
  const sources = {
    rabbitTemp: await ensureSource(
      "temp-rabbit-a",
      "Building A temperature readings via RabbitMQ (sensor.temperature.a).",
      {
        sourceType: "RABBIT_MQ",
        url: "amqp://guest:guest@rabbitmq:5672",
        queue_name: "sensor.temperature.a",
        consumer_name: "iot-bees-temp-a",
      },
    ),
    rabbitPressure: await ensureSource(
      "pressure-rabbit-b",
      "Building A pressure readings via RabbitMQ (sensor.pressure.b).",
      {
        sourceType: "RABBIT_MQ",
        url: "amqp://guest:guest@rabbitmq:5672",
        queue_name: "sensor.pressure.b",
        consumer_name: "iot-bees-pressure-b",
      },
    ),
    rabbitLegacy: await ensureSource(
      "legacy-amqp",
      "Legacy RFID/payload feed (warehouse gates) via AMQP.",
      {
        sourceType: "RABBIT_MQ",
        url: "amqp://guest:guest@rabbitmq:5672",
        queue_name: "legacy.rfid.events",
        consumer_name: "iot-bees-rfid",
      },
    ),
    mqttRooftop: await ensureSource(
      "mqtt-rooftop",
      "MQTT bridge for rooftop weather station array.",
      {
        sourceType: "MQTT",
        broker_url: "mqtt://mqtt-broker:1883",
        topic: "building/a/rooftop/+",
        client_id: "iot-bees-rooftop",
      },
    ),
    mqttGateway: await ensureSource(
      "mqtt-cellular-gw",
      "Cellular gateways uplink (LoRa over MQTT bridge).",
      {
        sourceType: "MQTT",
        broker_url: "mqtt://mqtt-broker:1883",
        topic: "gateways/+/uplink",
        client_id: "iot-bees-cellular-gw",
      },
    ),
    kafkaVibrations: await ensureSource(
      "kafka-vibrations",
      "Kafka topic for high-frequency vibration sensor data.",
      {
        sourceType: "KAFKA",
        brokers: ["kafka:9092"],
        topic: "vibrations.live",
        group_id: "iot-bees-vibrations",
      },
    ),
  };

  console.log("\n[stores]");
  const stores = {
    influxProd: await ensureStore(
      "influx-prod",
      "Production InfluxDB cluster for time-series metrics.",
      {
        persistenceType: "INFLUX_DB",
        url: "http://influxdb:8086",
        data_base: "metrics",
        measurement: "sensors",
        token: "PROD_TOKEN_PLACEHOLDER",
        tag_fields: ["location", "sensor_id"],
      },
    ),
    influxStaging: await ensureStore(
      "influx-staging",
      "Staging InfluxDB for testing new pipelines without polluting prod.",
      {
        persistenceType: "INFLUX_DB",
        url: "http://influxdb-staging:8086",
        data_base: "metrics-staging",
        measurement: "sensors",
        token: "STAGING_TOKEN_PLACEHOLDER",
        tag_fields: ["location"],
      },
    ),
    debugLog: await ensureStore(
      "debug-log",
      "Local file log for raw debugging — pipe through `tail -f`.",
      { persistenceType: "LOCAL_LOG", log_name: "debug" },
    ),
    auditFallback: await ensureStore(
      "audit-fallback",
      "Append-only local log for RFID events (audit trail / fallback).",
      { persistenceType: "LOCAL_LOG", log_name: "rfid-audit" },
    ),
  };

  console.log("\n[schemas]");
  const schemas = {
    weather: await ensureSchema("weather", {
      temperature: f.float({ required: true, min: -50, max: 150 }),
      humidity: f.float({ required: true, min: 0, max: 100 }),
      location: f.string({ required: false }),
    }),
    energy: await ensureSchema("energy", {
      voltage: f.float({ required: true, min: 80, max: 260 }),
      current: f.float({ required: true, min: 0, max: 50 }),
      power: f.float({ required: false, operation: mul(v("voltage"), v("current")) }),
    }),
    motion: await ensureSchema("motion", {
      ax: f.float({ required: true, min: -100, max: 100 }),
      ay: f.float({ required: true, min: -100, max: 100 }),
      az: f.float({ required: true, min: -100, max: 100 }),
      timestamp: f.string({ required: true }),
    }),
    rfidEvent: await ensureSchema("rfid-event", {
      tag_id: f.string({ required: true }),
      antenna: f.int({ required: true, min: 1, max: 16 }),
      rssi: f.float({ required: true, min: -120, max: 0 }),
    }),
  };

  console.log("\n[pipelines]");
  const pipelinePayloads = [
    {
      name: "temp-pipe-building-a",
      dataSourceId: sources.rabbitTemp,
      validationSchemaId: schemas.weather,
      dataStoreId: stores.influxProd,
      pipelineGroupId: groups.buildingA,
      dataStoreDescription: "Building A temperature → InfluxDB prod.",
      pipelineReplication: 2,
    },
    {
      name: "pressure-pipe-building-a",
      dataSourceId: sources.rabbitPressure,
      validationSchemaId: schemas.weather,
      dataStoreId: stores.influxProd,
      pipelineGroupId: groups.buildingA,
      dataStoreDescription: "Building A pressure → InfluxDB prod.",
      pipelineReplication: 1,
    },
    {
      name: "rooftop-weather-pipe",
      dataSourceId: sources.mqttRooftop,
      validationSchemaId: schemas.weather,
      dataStoreId: stores.influxStaging,
      pipelineGroupId: groups.labFloor,
      dataStoreDescription: "Rooftop array → InfluxDB staging (validation soak).",
      pipelineReplication: 2,
    },
    {
      name: "cellular-energy-pipe",
      dataSourceId: sources.mqttGateway,
      validationSchemaId: schemas.energy,
      dataStoreId: stores.influxStaging,
      pipelineGroupId: groups.labFloor,
      dataStoreDescription: "Cellular gateway energy readings → InfluxDB staging.",
      pipelineReplication: 1,
    },
    {
      name: "vibration-testbench-pipe",
      dataSourceId: sources.kafkaVibrations,
      validationSchemaId: schemas.motion,
      dataStoreId: stores.debugLog,
      pipelineGroupId: groups.labFloor,
      dataStoreDescription: "Kafka vibrations → local debug log (high-rate test).",
      pipelineReplication: 2,
    },
    {
      name: "warehouse-rfid-pipe",
      dataSourceId: sources.rabbitLegacy,
      validationSchemaId: schemas.rfidEvent,
      dataStoreId: stores.auditFallback,
      pipelineGroupId: groups.warehouse,
      dataStoreDescription: "Warehouse RFID events → local audit log.",
      pipelineReplication: 1,
    },
  ];
  for (const p of pipelinePayloads) {
    await ensurePipeline(p);
  }

  console.log("\n✓ seed complete.");
  console.log("\nsummary:");
  console.log(`  groups:    ${Object.keys(groups).length}`);
  console.log(`  sources:   ${Object.keys(sources).length}`);
  console.log(`  stores:    ${Object.keys(stores).length}`);
  console.log(`  schemas:   ${Object.keys(schemas).length}`);
  console.log(`  pipelines: ${pipelinePayloads.length}`);
  console.log("\ntip: pipelines are configured but NOT started — they'd fail against fake brokers.");
}

main().catch((e) => {
  console.error("× seed failed:", e.message);
  process.exit(1);
});
