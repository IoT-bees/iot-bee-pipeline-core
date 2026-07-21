# Despliegue independiente en Vercel

`web/` puede desplegarse como un proyecto Vercel autónomo. El navegador no
necesita CORS hacia el backend: siempre llama al BFF de Next.js bajo su propio
dominio, y Vercel realiza las llamadas servidor-a-servidor.

## Configuración del proyecto

1. Crear/importar el repositorio frontend en Vercel.
2. Si se conserva el monorepo temporalmente, configurar **Root Directory** como
   `web`. En el repositorio extraído, usar la raíz del proyecto.
3. Usar Node 20+ y `pnpm`; Vercel detecta `pnpm-lock.yaml`.
4. Mantener los comandos por defecto: `pnpm build` y `pnpm start` para pruebas
   locales. El CI debe ejecutar `pnpm typecheck`, `pnpm test` y `pnpm build`.

## Variables de entorno en Vercel

Configurar en Preview y Production según corresponda:

```dotenv
BACKEND_API_URL=https://api.example.com
BACKEND_API_TIMEOUT_MS=10000
AUTH_COOKIE_NAME=iot_bee_session
AUTH_COOKIE_MAX_AGE_HOURS=24
AUTH_COOKIE_SECURE=1
NEXT_PUBLIC_SITE_URL=https://app.example.com
```

Si Stripe está activo, añadir también `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SYNC_SECRET` y
`SERVICE_ADMIN_TOKEN`. Ninguna variable de servidor puede empezar por
`NEXT_PUBLIC_`.

`BACKEND_API_URL` es obligatorio en producción y debe usar HTTPS. El backend
debe ser accesible desde los datacenters de Vercel; una IP privada o
`localhost` no funciona. Permitir tráfico desde Internet con TLS, o usar una
conexión privada compatible con el proveedor de despliegue.

## Requisitos del backend independiente

- Mantener los endpoints y estados HTTP del
  [contrato](./API-CONTRACT.md).
- Aceptar `Authorization: Bearer <JWT>` desde el BFF. El navegador nunca debe
  llamar al backend autenticado directamente.
- Exponer HTTPS con un certificado válido. CORS no es necesario para el flujo
  normal BFF; sólo configurarlo si se decide admitir consumidores browser
  externos.
- Restringir el endpoint de sincronización Stripe mediante
  `SERVICE_ADMIN_TOKEN` y `STRIPE_SYNC_SECRET`; el BFF no lo publica por proxy.
- Publicar OpenAPI en una URL accesible al equipo. Para actualizar tipos de
  forma explícita: `pnpm gen:api "$OPENAPI_URL" -o lib/api/types.generated.ts`.

## Dominio, cookies y Stripe

Servir la aplicación desde su dominio final antes de probar sesiones. Las
cookies son host-only y `Secure`; no requieren compartir cookie con el dominio
del backend. Configurar en Stripe los retornos hacia
`https://app.example.com/billing/stripe/success` y el webhook hacia
`https://app.example.com/api/stripe/webhook`.

## Smoke test posterior al despliegue

1. Abrir `https://app.example.com/login` y completar login.
2. Confirmar que no aparece token en Storage ni en las respuestas de login.
3. Desde DevTools, verificar que las llamadas de aplicación son relativas a
   `/api/*`, nunca a `api.example.com`.
4. Confirmar que `GET /api/proxy/health` responde y que una operación de datos
   recibe el estado del backend a través del gateway.
5. Probar logout y, si aplica, un checkout Stripe y su webhook en Preview.
