import Link from "next/link";

import { MarketingNav } from "@/components/landing/MarketingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import {
  Callout,
  CodeBlock,
  InlineCode,
  Section,
  Steps,
  SubSection,
  Table,
} from "@/components/docs/Primitives";
import {
  DocsMobileNav,
  DocsSidebar,
  type DocsSection,
} from "@/components/docs/DocsSidebar";

const SECTIONS: DocsSection[] = [
  { id: "overview", number: "01", title: "Overview" },
  { id: "quickstart", number: "02", title: "Quickstart" },
  { id: "installation", number: "03", title: "Installation" },
  { id: "configuration", number: "04", title: "Configuration" },
  { id: "concepts", number: "05", title: "Concepts" },
  { id: "web-app", number: "06", title: "Using the web app" },
  { id: "rest-api", number: "07", title: "REST API" },
  { id: "architecture", number: "08", title: "Architecture" },
  { id: "deployment", number: "09", title: "Deployment" },
  { id: "troubleshooting", number: "10", title: "Troubleshooting" },
];

export default function DocsPage() {
  return (
    <>
      <MarketingNav />

      <div className="px-4 sm:px-6 lg:px-12 py-12 max-w-[1280px] w-full mx-auto">
        <div className="mb-10">
          <Link
            href="/"
            className="text-[12px] tracking-[2px] uppercase text-[var(--color-fg-3)] hover:text-[var(--color-accent)] transition-colors font-mono"
          >
            ← back to landing
          </Link>
          <h1 className="text-[40px] sm:text-[52px] font-bold tracking-[-2px] text-[var(--color-fg-0)] mt-4 leading-[1.05]">
            Documentation
          </h1>
          <p className="text-[16px] text-[var(--color-fg-3)] mt-3 max-w-[680px]">
            Everything you need to install, configure and run iot bees on your
            own infrastructure.
          </p>
        </div>

        <div className="flex gap-12">
          <DocsSidebar sections={SECTIONS} />

          <div className="flex-1 min-w-0">
            <DocsMobileNav sections={SECTIONS} />

            <Section id="overview" number="01" title="Overview">
              <p>
                <strong>iot bees</strong> is a self-hosted platform that connects
                IoT message brokers (RabbitMQ, MQTT, Kafka) to time-series and
                file storage (InfluxDB, local logs) through configurable,
                schema-validated pipelines. You configure everything from a web
                UI; iot bees handles the connections, validation, transforms and
                persistence in a single Rust binary.
              </p>
              <p>
                The point: stop writing one-off services every time a new sensor
                shows up. Define a source, a schema, and a store, glue them
                together as a pipeline, hit start.
              </p>

              <SubSection title="Who it is for">
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li>
                    Engineers running industrial, agricultural, energy or
                    building deployments where data flows from many sensors
                    into a single database.
                  </li>
                  <li>
                    Teams that want to <strong>own their data plane</strong> —
                    no SaaS account, no egress to a third party, no telemetry.
                  </li>
                  <li>
                    Anyone tired of writing custom Python scripts to validate
                    payloads and forward them to InfluxDB.
                  </li>
                </ul>
              </SubSection>

              <SubSection title="What it ships with">
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li>
                    A REST API (Actix-web) for managing every pipeline resource.
                  </li>
                  <li>
                    An actor-based runtime (Actix on Tokio) that runs the
                    pipelines, with N replicas per pipeline.
                  </li>
                  <li>
                    A Next.js web UI for the entire CRUD + lifecycle.
                  </li>
                  <li>
                    JWT auth with first-run admin onboarding.
                  </li>
                  <li>
                    OpenAPI / Swagger UI at <InlineCode>/swagger-ui/</InlineCode>.
                  </li>
                </ul>
              </SubSection>
            </Section>

            <Section id="quickstart" number="02" title="Quickstart">
              <p>
                The fastest path from zero to a running pipeline, assuming the
                backend and the web UI are already up.
              </p>

              <SubSection id="first-admin" title="Create your admin account (first run)">
                <p>
                  iot bees ships <strong>without any user</strong>. The very
                  first time you visit the app, the login screen offers to
                  create the admin account for you. Once that account exists,
                  open registration is disabled — only the admin can run the
                  instance.
                </p>
                <Steps
                  items={[
                    {
                      title: "Open the app",
                      body: (
                        <>
                          Visit{" "}
                          <InlineCode>http://localhost:3000/login</InlineCode>{" "}
                          (or whatever URL your deployment is at). The
                          frontend asks the backend{" "}
                          <InlineCode>GET /auth/has-users</InlineCode>; if it
                          comes back as <InlineCode>false</InlineCode>, the
                          form switches to{" "}
                          <strong>create admin account</strong>.
                        </>
                      ),
                    },
                    {
                      title: "Fill the three fields",
                      body: (
                        <>
                          <strong>Email</strong> (e.g.{" "}
                          <InlineCode>admin@your-company.com</InlineCode>),{" "}
                          <strong>name</strong> (the label shown in the top
                          right of the app),{" "}
                          <strong>password</strong> (8 characters minimum —
                          longer is better; this is a self-hosted instance and
                          you set the security bar).
                        </>
                      ),
                    },
                    {
                      title: "Submit",
                      body: (
                        <>
                          Click <InlineCode>+ CREATE ADMIN</InlineCode>. The
                          backend hashes the password with Argon2id, stores the
                          row, and signs a JWT. The frontend writes the JWT
                          into an HttpOnly session cookie and redirects you to{" "}
                          <InlineCode>/app</InlineCode>.
                        </>
                      ),
                    },
                    {
                      title: "From now on you log in normally",
                      body: (
                        <>
                          Subsequent visits to{" "}
                          <InlineCode>/login</InlineCode> show the regular
                          login form — the backend remembers a user already
                          exists and rejects further registration with{" "}
                          <InlineCode>403 RegistrationDisabled</InlineCode>.
                          You can log out via the dropdown in the top right.
                        </>
                      ),
                    },
                  ]}
                />
                <Callout title="forgot the password?" kind="warn">
                  There is no password-reset endpoint in the MVP. If you lose
                  the credentials, stop the backend, delete the row from the{" "}
                  <InlineCode>users</InlineCode> table in your SQLite file (or
                  delete <InlineCode>data/iot-bee.db</InlineCode> entirely if
                  you have nothing else to keep), restart, and create a fresh
                  admin.
                </Callout>
                <Callout title="creating extra accounts" kind="info">
                  Multi-user is not in the MVP. The single admin owns
                  everything. If you need that, open an issue with your use
                  case.
                </Callout>
              </SubSection>

              <SubSection id="first-pipeline" title="Build your first pipeline">
                <p>
                  Once you&apos;re inside <InlineCode>/app</InlineCode>, the
                  overview page shows a <strong>setup checklist</strong> with
                  five cards. Click each one in order — the page tracks which
                  ones are done and hides the checklist when everything is
                  set up.
                </p>
              </SubSection>

              <Steps
                items={[
                  {
                    title: "Open the app and create the admin",
                    body: (
                      <>
                        Covered above. Once you&apos;re in{" "}
                        <InlineCode>/app</InlineCode> the setup checklist takes
                        over.
                      </>
                    ),
                  },
                  {
                    title: "Create a data source",
                    body: (
                      <>
                        Go to <InlineCode>/sources</InlineCode> →{" "}
                        <InlineCode>+ NEW SOURCE</InlineCode>. Pick a type
                        (RabbitMQ, MQTT or Kafka), fill the connection details,
                        save.
                      </>
                    ),
                  },
                  {
                    title: "Create a data store",
                    body: (
                      <>
                        Go to <InlineCode>/stores</InlineCode> →{" "}
                        <InlineCode>+ NEW STORE</InlineCode>. Pick{" "}
                        <InlineCode>LOCAL_LOG</InlineCode> for the easiest demo,
                        or <InlineCode>INFLUX_DB</InlineCode> if you have one
                        running.
                      </>
                    ),
                  },
                  {
                    title: "Create a validation schema",
                    body: (
                      <>
                        Go to <InlineCode>/schemas</InlineCode> →{" "}
                        <InlineCode>+ NEW SCHEMA</InlineCode>. Use the{" "}
                        <InlineCode>load example</InlineCode> button to bootstrap
                        a 3-field schema you can edit.
                      </>
                    ),
                  },
                  {
                    title: "Wire a pipeline and start it",
                    body: (
                      <>
                        Go to <InlineCode>/pipelines</InlineCode> →{" "}
                        <InlineCode>+ NEW PIPELINE</InlineCode>. The 5-step
                        wizard walks you through name → source → schema → store →
                        replicas. Save, then click{" "}
                        <InlineCode>▸ start</InlineCode>. The status pill flips
                        to <InlineCode>RUNNING</InlineCode> within 5 seconds.
                      </>
                    ),
                  },
                ]}
              />
              <Callout title="press ⌘K" kind="info">
                Open the command bar with <InlineCode>⌘K</InlineCode> (or{" "}
                <InlineCode>Ctrl+K</InlineCode>) to jump anywhere or create
                anything without using the menu.
              </Callout>
            </Section>

            <Section id="installation" number="03" title="Installation">
              <SubSection title="Prerequisites">
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li>
                    Rust toolchain (stable, edition 2024). Install via{" "}
                    <a
                      href="https://rustup.rs/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      rustup.rs
                    </a>
                    .
                  </li>
                  <li>
                    Node 20+ and <InlineCode>pnpm</InlineCode> for the web UI:{" "}
                    <InlineCode>npm i -g pnpm</InlineCode>.
                  </li>
                  <li>
                    A message broker the pipeline can consume from (any of
                    RabbitMQ, MQTT, Kafka).
                  </li>
                  <li>
                    Optional: an InfluxDB instance, or use{" "}
                    <InlineCode>LOCAL_LOG</InlineCode> while you experiment.
                  </li>
                </ul>
              </SubSection>

              <SubSection title="Clone and prepare">
                <CodeBlock language="bash">{`$ git clone https://github.com/manuelmj/iot-bee.git
$ cd iot-bee
$ mkdir -p data
$ cp .env.example .env`}</CodeBlock>
              </SubSection>

              <SubSection title="Run database migrations">
                <p>
                  Migrations are bundled into the binary; on first start it
                  applies any pending migration to the SQLite database
                  automatically. If you want to apply them manually:
                </p>
                <CodeBlock language="bash">{`$ cargo install sqlx-cli --features sqlite
$ sqlx migrate run --database-url sqlite://data/iot-bee.db`}</CodeBlock>
              </SubSection>

              <SubSection title="Run the backend">
                <CodeBlock language="bash">{`$ JWT_SECRET=change-me-to-a-long-random-string make run
# equivalent to: cargo fmt && cargo check && RUST_LOG=info cargo run`}</CodeBlock>
                <p>
                  The HTTP server starts at{" "}
                  <InlineCode>http://127.0.0.1:8080</InlineCode>. Swagger UI
                  lives at <InlineCode>/swagger-ui/</InlineCode>.
                </p>
              </SubSection>

              <SubSection title="Run the web UI">
                <CodeBlock language="bash">{`$ cd web
$ cp .env.local.example .env.local
$ pnpm install
$ pnpm dev   # http://localhost:3000`}</CodeBlock>
                <p>
                  Open <InlineCode>http://localhost:3000</InlineCode>. The first
                  visit to <InlineCode>/login</InlineCode> on a fresh database
                  will offer to create the admin account.
                </p>
              </SubSection>
            </Section>

            <Section id="configuration" number="04" title="Configuration">
              <SubSection title="Backend environment variables">
                <Table
                  head={["Variable", "Required", "Default", "Description"]}
                  rows={[
                    [
                      <InlineCode key="db">DATABASE_URL</InlineCode>,
                      "yes",
                      "—",
                      "SQLite connection string. Example: sqlite://data/iot-bee.db",
                    ],
                    [
                      <InlineCode key="jwt">JWT_SECRET</InlineCode>,
                      "yes",
                      "—",
                      "HS256 signing secret. Use a long random value in production.",
                    ],
                    [
                      <InlineCode key="ttl">JWT_EXPIRES_IN_HOURS</InlineCode>,
                      "no",
                      "24",
                      "Access token lifetime in hours.",
                    ],
                    [
                      <InlineCode key="cors">CORS_ORIGINS</InlineCode>,
                      "no",
                      "http://localhost:3000",
                      "Comma-separated list of origins allowed to call the API.",
                    ],
                    [
                      <InlineCode key="host">API_HOST</InlineCode>,
                      "no",
                      "127.0.0.1",
                      "Bind address.",
                    ],
                    [
                      <InlineCode key="port">API_PORT</InlineCode>,
                      "no",
                      "8080",
                      "Bind port.",
                    ],
                    [
                      <InlineCode key="log">RUST_LOG</InlineCode>,
                      "no",
                      "info",
                      "Tracing filter. Try iot_bee=debug for more detail.",
                    ],
                  ]}
                />
              </SubSection>

              <SubSection title="Web UI environment variables">
                <Table
                  head={["Variable", "Default", "Description"]}
                  rows={[
                    [
                      <InlineCode key="pub">NEXT_PUBLIC_API_URL</InlineCode>,
                      "http://localhost:8080",
                      "Backend URL surfaced in the footer / status indicator.",
                    ],
                    [
                      <InlineCode key="int">INTERNAL_API_URL</InlineCode>,
                      "http://localhost:8080",
                      "Backend URL used by Next route handlers (server-side).",
                    ],
                    [
                      <InlineCode key="cookie">AUTH_COOKIE_NAME</InlineCode>,
                      "iot_bee_session",
                      "Name of the HttpOnly session cookie.",
                    ],
                    [
                      <InlineCode key="age">
                        AUTH_COOKIE_MAX_AGE_HOURS
                      </InlineCode>,
                      "24",
                      "Cookie lifetime, must match JWT_EXPIRES_IN_HOURS.",
                    ],
                  ]}
                />
              </SubSection>
            </Section>

            <Section id="concepts" number="05" title="Concepts">
              <p>
                Five resources make up an iot bees deployment. Get familiar with
                them — every UI page maps to one.
              </p>

              <SubSection id="data-source" title="Data Source">
                <p>
                  A connection to a message broker. Each source has a name, a
                  type (<InlineCode>RABBIT_MQ</InlineCode>,{" "}
                  <InlineCode>MQTT</InlineCode> or <InlineCode>KAFKA</InlineCode>
                  ), and a config object with the broker-specific fields (host,
                  queue/topic, group_id, etc.).
                </p>
              </SubSection>

              <SubSection id="validation-schema" title="Validation Schema">
                <p>
                  Defines the contract of a message: which fields to expect,
                  their type, range, default value and (optionally) a
                  transformation expression. Messages that don&apos;t match the
                  schema are rejected; matching messages get cleaned and
                  forwarded.
                </p>
                <CodeBlock language="json">{`{
  "name": "environmental_station",
  "schema": {
    "temperature": {
      "type": "float",
      "required": true,
      "default": null,
      "validation": { "min": -40, "max": 85 },
      "operation": null
    },
    "humidity": {
      "type": "float",
      "required": true,
      "validation": { "min": 0, "max": 100 },
      "operation": null
    }
  }
}`}</CodeBlock>
                <p>
                  The <InlineCode>operation</InlineCode> field is an arithmetic
                  AST: <InlineCode>num</InlineCode>, <InlineCode>var</InlineCode>{" "}
                  and <InlineCode>bin_op</InlineCode> nodes (<InlineCode>Add</InlineCode>
                  , <InlineCode>Sub</InlineCode>, <InlineCode>Mul</InlineCode>,{" "}
                  <InlineCode>Div</InlineCode>) that runs after validation. Use
                  it for unit conversion, calibration, etc.
                </p>
              </SubSection>

              <SubSection id="data-store" title="Data Store">
                <p>
                  Where validated records land. Two persistence types:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li>
                    <InlineCode>INFLUX_DB</InlineCode> — writes to a database +
                    measurement. String fields listed in{" "}
                    <InlineCode>tag_fields</InlineCode> become InfluxDB tags;
                    everything else becomes fields.
                  </li>
                  <li>
                    <InlineCode>LOCAL_LOG</InlineCode> — appends newline-delimited
                    JSON to a file. Great for local dev and small deployments.
                  </li>
                </ul>
              </SubSection>

              <SubSection id="pipeline" title="Pipeline">
                <p>
                  Wires one source + one schema + one store. Has a name, a
                  replication count (number of concurrent worker actors), and an
                  optional group_id. A pipeline is the thing you start and stop
                  at runtime.
                </p>
              </SubSection>

              <SubSection id="pipeline-group" title="Pipeline Group">
                <p>
                  Optional logical container. Use groups to organise pipelines
                  by site, customer, or environment.
                </p>
              </SubSection>

              <SubSection id="lifecycle" title="Pipeline Lifecycle">
                <p>
                  Pipelines live in three states:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li>
                    <InlineCode>RUNNING</InlineCode> — actor hierarchy is active
                    and consuming.
                  </li>
                  <li>
                    <InlineCode>STOPPED</InlineCode> — pipeline exists in DB
                    but isn&apos;t consuming.
                  </li>
                  <li>
                    <InlineCode>ERROR</InlineCode> — pipeline crashed or failed
                    to start; check the backend logs.
                  </li>
                </ul>
              </SubSection>
            </Section>

            <Section id="web-app" number="06" title="Using the web app">
              <SubSection title="First-run register">
                <p>
                  Visit <InlineCode>/login</InlineCode>. If the database has no
                  users, the form shows <strong>create admin account</strong>.
                  Fill email + name + password (≥ 8 chars), submit. You land on{" "}
                  <InlineCode>/app</InlineCode> with an HttpOnly session cookie.
                </p>
              </SubSection>

              <SubSection title="Navigation">
                <p>
                  The top bar has six tabs:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li>
                    <strong>overview</strong> — global stats and live status of
                    all pipelines.
                  </li>
                  <li>
                    <strong>pipelines</strong> — list, create, start/stop.
                  </li>
                  <li>
                    <strong>sources</strong>, <strong>stores</strong>,{" "}
                    <strong>schemas</strong>, <strong>groups</strong> — full
                    CRUD for each resource.
                  </li>
                </ul>
                <p>
                  On mobile the tabs collapse into a full-screen navigation overlay. Your
                  user badge sits in the top-right with a dropdown showing
                  email, role and sign-out.
                </p>
              </SubSection>

              <SubSection title="Command bar">
                <p>
                  <InlineCode>⌘K</InlineCode> (or{" "}
                  <InlineCode>Ctrl+K</InlineCode>) opens a command palette to
                  navigate or create resources without touching the menu. On
                  mobile, the command bar collapses to a floating ⌘ button at
                  the bottom-right.
                </p>
              </SubSection>

              <SubSection title="Editing schemas">
                <p>
                  The schema editor is a raw-JSON editor with a live preview
                  panel. The <InlineCode>load example</InlineCode> button
                  bootstraps a working three-field schema you can adapt. Click
                  save; the preview updates as you type.
                </p>
                <Callout kind="info">
                  Why JSON and not a visual builder? Operations are AST
                  expressions (e.g. <InlineCode>{"{ \"type\": \"bin_op\", \"op\": \"Mul\", \"left\": ..., \"right\": ... }"}</InlineCode>
                  ). A visual editor for the full grammar is out of scope; raw
                  JSON keeps the door open to every backend feature.
                </Callout>
              </SubSection>
            </Section>

            <Section id="rest-api" number="07" title="REST API">
              <p>
                Every page in the web app is backed by a REST endpoint.
                Interactive Swagger UI is served at{" "}
                <InlineCode>http://127.0.0.1:8080/swagger-ui/</InlineCode>.
              </p>

              <SubSection title="Authentication">
                <p>
                  All endpoints (except <InlineCode>/auth/*</InlineCode> and{" "}
                  <InlineCode>/swagger-ui/*</InlineCode>) require an HS256 JWT
                  in the <InlineCode>Authorization</InlineCode> header.
                </p>
                <CodeBlock language="bash">{`$ curl -X POST http://127.0.0.1:8080/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"email":"admin@iot-bee.dev","password":"iotbee2026"}'

# response:
{
  "user": { "id": 1, "email": "...", "name": "...", "role": "admin" },
  "token": "eyJ0eXAi..."
}

$ curl http://127.0.0.1:8080/data-sources \\
    -H "Authorization: Bearer eyJ0eXAi..."`}</CodeBlock>
              </SubSection>

              <SubSection title="Endpoint summary">
                <Table
                  head={["Resource", "Base path", "Description"]}
                  rows={[
                    [
                      "Auth",
                      <InlineCode key="a">/auth</InlineCode>,
                      "Login, first-admin register, has-users probe, current user.",
                    ],
                    [
                      "Connection Types",
                      <InlineCode key="ct">/connection-types</InlineCode>,
                      "Read-only list of supported source/store identifiers.",
                    ],
                    [
                      "Data Sources",
                      <InlineCode key="ds">/data-sources</InlineCode>,
                      "CRUD for broker connections.",
                    ],
                    [
                      "Data Stores",
                      <InlineCode key="db">/data-stores</InlineCode>,
                      "CRUD for persistence destinations.",
                    ],
                    [
                      "Validation Schemas",
                      <InlineCode key="vs">/validation-schemas</InlineCode>,
                      "CRUD for schemas; PUT /{id}/name for rename.",
                    ],
                    [
                      "Pipeline Groups",
                      <InlineCode key="pg">/pipeline-groups</InlineCode>,
                      "Create / list / delete logical groups.",
                    ],
                    [
                      "Pipelines",
                      <InlineCode key="p">/pipelines</InlineCode>,
                      "CRUD plus PUT endpoints for relation assignments.",
                    ],
                    [
                      "Pipeline Lifecycle",
                      <InlineCode key="pl">/pipeline-lifecycle</InlineCode>,
                      "Start, stop, status (single + all).",
                    ],
                  ]}
                />
              </SubSection>

              <SubSection title="Error format">
                <p>
                  Failures return JSON of the shape{" "}
                  <InlineCode>{"{ \"error\": \"<message>\" }"}</InlineCode> with
                  the appropriate HTTP status (400, 401, 403, 404, 409, 500).
                </p>
              </SubSection>
            </Section>

            <Section id="architecture" number="08" title="Architecture">
              <p>
                Hexagonal layering with a top-level supervisor that owns one
                supervisor per pipeline. Each pipeline runs N replicas. Each
                replica is a chain of three actors (consumer → processor →
                store) connected through MPSC channels.
              </p>
              <CodeBlock language="text">{`SystemActorSupervisor
  └─ PipelineSupervisor                    (one per pipeline)
        ├─ Replica 1: [consumer] → [processor] → [store]
        ├─ Replica 2: [consumer] → [processor] → [store]
        └─ Replica N: [consumer] → [processor] → [store]`}</CodeBlock>

              <SubSection title="Crate layout">
                <CodeBlock language="text">{`crates/
├── domain/          pure entities, ports and error types
├── application/     use cases (one module per aggregate)
├── infrastructure/  SQLite repos, broker drivers, security (argon2 + jwt)
├── adapters/        Actix HTTP handlers + actor system
└── logging/         tracing wrapper`}</CodeBlock>
              </SubSection>

              <SubSection title="Failure isolation">
                <p>
                  If a single replica crashes, only that replica is restarted —
                  the rest of the pipeline keeps streaming. Pipelines are
                  isolated from each other; a runaway pipeline cannot take down
                  the others or the HTTP server.
                </p>
              </SubSection>
            </Section>

            <Section id="deployment" number="09" title="Deployment">
              <p>
                The frontend and backend are intentionally decoupled — they only
                talk over HTTP. You can host them anywhere; the recommended
                split is the frontend on Vercel and the backend on a server you
                control (VPS, fly.io, Railway, your own metal).
              </p>

              <SubSection title="Architecture summary">
                <CodeBlock language="text">{`Browser
  └─ Next.js (Vercel)            ← serves landing, login, app, /api/proxy
        └─ HTTP                    ← server-to-server, with Bearer
              └─ iot-bee backend  ← Rust binary on YOUR server`}</CodeBlock>
                <p>
                  The browser <strong>never calls the backend directly</strong>.
                  All API calls go through a thin Next route handler at{" "}
                  <InlineCode>/api/proxy/[...path]</InlineCode> that translates
                  the HttpOnly session cookie into an{" "}
                  <InlineCode>Authorization: Bearer</InlineCode> header. Three
                  consequences:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li>
                    The JWT never reaches client-side JavaScript (immune to XSS
                    token theft).
                  </li>
                  <li>
                    No CORS headers are required for the normal flow — the only
                    cross-origin call is server-to-server.
                  </li>
                  <li>
                    You can put the backend on a private network and expose
                    only the Vercel frontend publicly, as long as Vercel
                    functions can reach the backend.
                  </li>
                </ul>
              </SubSection>

              <SubSection title="Deploy the backend">
                <p>
                  Build a release binary on the target machine (or in a CI
                  pipeline) and run it under a process supervisor of your
                  choice (systemd, supervisord, fly.io machines, etc.).
                </p>
                <CodeBlock language="bash">{`# on the server
$ cargo build --release
$ ./target/release/iot-bee   # listens on $API_HOST:$API_PORT`}</CodeBlock>
                <p>Required env on the backend:</p>
                <Table
                  head={["Variable", "Example value"]}
                  rows={[
                    [
                      <InlineCode key="db">DATABASE_URL</InlineCode>,
                      "sqlite:///var/lib/iot-bee/data.db",
                    ],
                    [
                      <InlineCode key="js">JWT_SECRET</InlineCode>,
                      "<output of `openssl rand -hex 32`>",
                    ],
                    [
                      <InlineCode key="cors">CORS_ORIGINS</InlineCode>,
                      "https://iotbees.com",
                    ],
                    [
                      <InlineCode key="host">API_HOST</InlineCode>,
                      "0.0.0.0",
                    ],
                    [
                      <InlineCode key="port">API_PORT</InlineCode>,
                      "8080",
                    ],
                  ]}
                />
                <Callout title="put it behind a reverse proxy" kind="info">
                  Run nginx / Caddy / Traefik in front of the binary to
                  terminate TLS and route traffic. Public URL is what Vercel
                  needs to reach.
                </Callout>
              </SubSection>

              <SubSection title="Deploy the frontend on Vercel">
                <p>
                  The <InlineCode>web/</InlineCode> directory is a standard
                  Next.js 15 project — no <InlineCode>vercel.json</InlineCode>{" "}
                  required.
                </p>
                <Steps
                  items={[
                    {
                      title: "Connect the repo",
                      body: (
                        <>
                          Import the repository on Vercel and set the{" "}
                          <strong>root directory</strong> to{" "}
                          <InlineCode>web</InlineCode>. Framework auto-detects.
                        </>
                      ),
                    },
                    {
                      title: "Set environment variables",
                      body: (
                        <>
                          In the Vercel project settings → Environment
                          Variables, add the four below. Mark{" "}
                          <InlineCode>INTERNAL_API_URL</InlineCode> and{" "}
                          <InlineCode>NEXT_PUBLIC_API_URL</InlineCode> as
                          required for both Production and Preview environments.
                        </>
                      ),
                    },
                    {
                      title: "Allow the frontend in the backend's CORS",
                      body: (
                        <>
                          On the backend, add the Vercel deployment URL to{" "}
                          <InlineCode>CORS_ORIGINS</InlineCode> (e.g.{" "}
                          <InlineCode>https://iotbees.com</InlineCode>).
                          Restart the backend so the new value takes effect.
                        </>
                      ),
                    },
                    {
                      title: "Deploy",
                      body: (
                        <>
                          Push to the configured branch. Vercel builds and
                          serves; the first request to{" "}
                          <InlineCode>/login</InlineCode> on a fresh backend will
                          offer to create the admin account.
                        </>
                      ),
                    },
                  ]}
                />
                <Table
                  head={["Vercel env var", "Value"]}
                  rows={[
                    [
                      <InlineCode key="pub">NEXT_PUBLIC_API_URL</InlineCode>,
                      "https://api.your-domain.com",
                    ],
                    [
                      <InlineCode key="int">INTERNAL_API_URL</InlineCode>,
                      "https://api.your-domain.com",
                    ],
                    [
                      <InlineCode key="cn">AUTH_COOKIE_NAME</InlineCode>,
                      "iot_bee_session",
                    ],
                    [
                      <InlineCode key="ca">
                        AUTH_COOKIE_MAX_AGE_HOURS
                      </InlineCode>,
                      "24 (must match backend JWT_EXPIRES_IN_HOURS)",
                    ],
                  ]}
                />
                <Callout title="public vs internal URL" kind="warn">
                  Both env vars usually point to the same URL. They&apos;re kept
                  separate in case you want server-side calls to use a private
                  internal URL (e.g. inside a VPC) and the browser to receive a
                  pretty public URL.{" "}
                  <InlineCode>NEXT_PUBLIC_*</InlineCode> is baked at build time
                  — change → redeploy.
                </Callout>
              </SubSection>

              <SubSection title="Verifying the deployment">
                <ol className="list-decimal pl-5 flex flex-col gap-1.5">
                  <li>
                    Visit{" "}
                    <InlineCode>https://&lt;vercel-url&gt;/auth/has-users</InlineCode>{" "}
                    via the Next proxy isn&apos;t public — instead curl your
                    backend directly and check it responds with{" "}
                    <InlineCode>{"{ \"has_users\": false }"}</InlineCode>.
                  </li>
                  <li>
                    Open <InlineCode>/login</InlineCode> and create the admin.
                    The redirect to <InlineCode>/app</InlineCode> proves the
                    cookie + proxy chain works end-to-end.
                  </li>
                  <li>
                    Open the backend status indicator in the top-right of the
                    app — it should show <InlineCode>Backend ONLINE</InlineCode>.
                  </li>
                </ol>
              </SubSection>
            </Section>

            <Section id="troubleshooting" number="10" title="Troubleshooting">
              <SubSection title="Backend won't start: 'JWT_SECRET requerida'">
                <p>
                  The backend fails fast if{" "}
                  <InlineCode>JWT_SECRET</InlineCode> is missing. Set it in
                  your shell or in <InlineCode>.env</InlineCode>:
                </p>
                <CodeBlock language="bash">{`$ export JWT_SECRET="$(openssl rand -hex 32)"`}</CodeBlock>
              </SubSection>

              <SubSection title="Login keeps showing 'create admin account'">
                <p>
                  This means the backend reports zero users. If you registered
                  successfully and you still see the create-admin form,
                  refresh; the page calls{" "}
                  <InlineCode>GET /auth/has-users</InlineCode> on mount. If the
                  form keeps appearing, your database is empty — check that the
                  backend is talking to the same{" "}
                  <InlineCode>DATABASE_URL</InlineCode> you registered against.
                </p>
              </SubSection>

              <SubSection title="CORS errors in the browser">
                <p>
                  Add the front-end origin to{" "}
                  <InlineCode>CORS_ORIGINS</InlineCode> on the backend and
                  restart. In dev the default already includes{" "}
                  <InlineCode>http://localhost:3000</InlineCode>.
                </p>
              </SubSection>

              <SubSection title="Pipeline goes straight to ERROR">
                <p>
                  Most often this means the broker connection failed or the
                  schema doesn&apos;t parse the incoming payload. Tail the
                  backend logs with{" "}
                  <InlineCode>RUST_LOG=iot_bee=debug</InlineCode> to see the
                  exact reason; the actor reports the error to the supervisor
                  before transitioning state.
                </p>
              </SubSection>

              <SubSection title="Need more help?">
                <p>
                  Open an issue at{" "}
                  <a
                    href="https://github.com/manuelmj/iot-bee/issues"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    github.com/manuelmj/iot-bee/issues
                  </a>{" "}
                  with the relevant log snippet, your config (redact secrets!),
                  and the steps to reproduce.
                </p>
              </SubSection>
            </Section>
          </div>
        </div>
      </div>

      <LandingFooter />
    </>
  );
}
