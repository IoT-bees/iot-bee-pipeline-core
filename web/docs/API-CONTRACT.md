# Contrato de integración de iot bees web

Este documento define el límite que `web/` consume del backend. Es el contrato
para extraer el frontend: no incluye tablas de persistencia, actores, brokers ni detalles Rust.

## Topología y seguridad

```text
browser -- cookie HttpOnly --> Next.js BFF (/api/*) -- Bearer JWT --> API backend
```

- El JWT sólo vive en la cookie `HttpOnly`. `/api/auth/login` y
  `/api/auth/register` devuelven únicamente `{ user }`.
- El navegador no recibe `BACKEND_API_URL`, `SERVICE_ADMIN_TOKEN`,
  `STRIPE_SECRET_KEY` ni `STRIPE_SYNC_SECRET`.
- `/api/proxy/*` es una lista permitida, no un proxy abierto. No expone
  `/license/stripe-sync`, métricas ni `auth/login`/`auth/register` del backend.
- El gateway usa `Cache-Control: private, no-store` y `Vary: Cookie`.
  React Query puede conservar datos en memoria brevemente, nunca entre sesiones.
- Las mutaciones con un `Origin` distinto al de la aplicación se rechazan.
  La cookie usa `HttpOnly`, `SameSite=Lax`, `Secure` en producción y `Path=/`.

## Variables de entorno

| Variable | Dónde se lee | Requisito |
| --- | --- | --- |
| `BACKEND_API_URL` | sólo servidor | URL HTTPS pública del backend en producción; no se expone. |
| `BACKEND_API_TIMEOUT_MS` | sólo servidor | Timeout de BFF→backend, 10000 ms por defecto, máximo 30000 ms. |
| `AUTH_COOKIE_NAME` | servidor y middleware | Nombre alfanumérico/`_`/`-`, idéntico en ambos. |
| `AUTH_COOKIE_MAX_AGE_HOURS` | sólo servidor | Positivo, máximo 8760; por defecto 24. |
| `AUTH_COOKIE_SECURE` | sólo servidor | `1` HTTPS, `0` sólo HTTP local; sin valor sigue `NODE_ENV`. |
| `NEXT_PUBLIC_SITE_URL` | público | Dominio canónico de la web. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | sólo servidor | Requeridos si Stripe está activo. |
| `STRIPE_SYNC_SECRET`, `SERVICE_ADMIN_TOKEN` | sólo servidor | Credenciales de sincronización backend. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | navegador | La única credencial Stripe pública. |

El ejemplo está en [`.env.local.example`](../.env.local.example). La capa
servidor valida URL y configuración de cookie antes de llamar al backend.

## Envelope de error y reintentos

Las respuestas correctas son JSON, excepto exportaciones de organización. El
error compatible esperado es:

```json
{ "error": "mensaje legible", "code": "opcional_estable" }
```

El backend actual puede omitir `code`; la web deriva `http_<status>`. Se
traducen explícitamente `400`, `401`, `402`, `403`, `404`, `409`, `429` y `5xx`.
Red equivale a `status: 0`; una respuesta 2xx que no sea JSON válido o incumpla
un schema se convierte en `502 / invalid_response` localmente. Las consultas
se reintentan como máximo dos veces sólo para red, `408`, `429` y `5xx`.
Las mutaciones nunca se reintentan automáticamente.

## Sesión

| Ruta web | Método | Backend | Request | Respuesta / acceso |
| --- | --- | --- | --- | --- |
| `/api/auth/login` | POST | `/auth/login` | `{ email, password }` | `{ user }` + cookie; `401` credenciales. |
| `/api/auth/register` | POST | `/auth/register` | `{ email, name, password }` | `{ user }` + cookie; primer admin, `403`/`409`. |
| `/api/auth/me` | GET | `/auth/me` | — | `{ user }`; sesión válida, `401`. |
| `/api/auth/logout` | POST | — | — | `{ ok: true }`; elimina cookie. |
| `/api/proxy/auth/has-users` | GET | `/auth/has-users` | — | `{ has_users: boolean }`; pública. |

`user` es `{ id, organizationId, email, name, role, status }`. El backend
puede responder `{ user, token }` sólo al BFF; su schema se valida antes de
emitir la cookie y ese token no se serializa al navegador.

## Recursos de operación

Todo lo siguiente pasa por `/api/proxy`, requiere sesión y queda acotado a la
organización. Lecturas: usuario autenticado. Mutaciones: el backend aplica su
política de rol actual (`admin` u `operator`); el frontend no reemplaza esa
autorización.

| Recurso | Métodos backend | Request principal | Respuesta |
| --- | --- | --- | --- |
| Tipos | `GET /connection-types` | — | `ConnectionType[]` (`id`, `name`). |
| Fuentes | `GET/POST /data-sources`, `GET/PUT/DELETE /data-sources/{id}`, `POST /data-sources/{id}/test` | `{ name, dataSourceConfiguration, dataSourceDescription }` | DTO fuente o `{ ok, message }`. |
| Destinos | `GET/POST /data-stores`, `GET/PUT/DELETE /data-stores/{id}`, `POST /data-stores/{id}/test` | `{ name, dataStoreConfiguration, dataStoreDescription }` | DTO destino o `{ ok, message }`. |
| Esquemas | `GET/POST /validation-schemas`, `GET/DELETE /validation-schemas/{id}`, `PUT /validation-schemas/{id}/name`, `PUT /validation-schemas/{id}/schema` | crear `{ name, schema }`; cambiar `{ name }` o `{ schema }` | DTO esquema. |
| Grupos | `GET/POST /pipeline-groups`, `GET/DELETE /pipeline-groups/{id}` | `{ name, description }` | `PipelineGroup` o `{ message }`. |
| Pipelines | `GET/POST /pipelines`, `GET/DELETE /pipelines/{id}`, `GET /pipelines/group/{groupId}` y `PUT` de asociación/replicas | `{ name, dataStoreId, pipelineGroupId, dataSourceId, validationSchemaId, dataStoreDescription, pipelineReplication }` | `Pipeline[]`/`Pipeline`; acciones pueden ser 2xx vacíos. |
| Ciclo | `GET /pipeline-lifecycle/status[/{id}]`, `POST /start/{id}`, `POST /stop/{id}`, `PUT /update-replication-factor/{id}/{replicas}` | IDs en ruta | `PipelineStatus` o 2xx vacío. |
| Licencia | `GET /license/status`, `POST /license/activate`, `POST /license/deactivate` | activar `{ licenseKey }` | `LicenseStatus`; `402` al exceder límites. |
| Catálogo | `GET /plans` | — | `{ items: Plan[] }`. |

Una fuente incluye `{ id, name, sourceType, dataSourceConfiguration: string,
dataSourceDescription, createdAt, updatedAt }`; un destino sustituye
`sourceType` por `storeType` y su configuración. Los tipos conocidos son
`RABBIT_MQ`, `MQTT`, `KAFKA`, `INFLUX_DB`, `LOCAL_LOG`, `WEBHOOK`. Un esquema
incluye `{ id, name, schema: string, createdAt, updatedAt }`. Las tres
configuraciones llegan hoy como JSON serializado: es contrato de API actual,
no un detalle de base de datos. La web valida en runtime estos DTOs crudos y
los envelopes de autenticación antes de normalizarlos.

## Administración y Stripe

`/admin/*` exige administrador; el backend es autoridad final y puede devolver
`403`. La web consume `GET /admin/audit` (filtros y cursor),
`GET /admin/system/status`, `GET/POST/PATCH/DELETE /admin/users`,
`GET/PATCH /admin/organization`, `GET/POST/PATCH/DELETE /admin/plans`,
`GET /admin/billing/events`, `POST /admin/billing/events/{id}/retry` y
`GET /admin/orgs/{id}/state|export`, `DELETE /admin/orgs/{id}`.

Las rutas `web/app/api/stripe/*` son BFF específico: consultan sesión en
servidor, comprueban la organización y conservan secretos server-side. El
webhook es la única ruta externa y valida firma Stripe antes de sincronizar.

## Contratos propuestos (sin cambiar backend)

1. Publicar `/v1` y OpenAPI versionado en CI; generar `types.ts` y comparar los
   schemas consumidos en vez de mantenerlos a mano.
2. Incluir siempre `code`, `requestId` y `fields: Record<string,string[]>` en
   errores de validación, sin mensajes internos.
3. Ofrecer DTOs JSON en lugar de JSON dentro de strings para configuración y
   schemas, manteniendo compatibilidad durante la transición.
4. Para dominios separados, mantener este BFF o proveer intercambio/refresh de
   sesión de corta duración; no pasar JWT a `localStorage`.
5. Añadir paginación cursor/limit y `ETag` o versión a las listas y updates.

## Guía breve de extracción

1. Mover `web/` con `pnpm-lock.yaml`, aliases y scripts; CI debe ejecutar
   `pnpm typecheck`, `pnpm test` y `pnpm build`.
2. Desplegar Next.js como BFF con `BACKEND_API_URL` HTTPS y
   `NEXT_PUBLIC_SITE_URL` público. No publicar la URL interna.
3. Conservar `/api/auth/*`, `/api/proxy/*` y `/api/stripe/*`; no cambiarlas por
   llamadas directas browser→backend.
4. Fijar este contrato y OpenAPI; el backend debe probar retrocompatibilidad
   antes de alterar DTOs o códigos HTTP consumidos.
5. Ejecutar pruebas contra backend efímero o MSW. Las pruebas de límite BFF,
   validación y reintentos viven en `web/test/api/client.contract.test.ts`.
