# iot bees web

Frontend Next.js independiente de iot bees. Consume la API del paquete `app/` mediante su gateway interno, por lo que el token de sesión no llega al navegador.

## Desarrollo local

```bash
cp .env.local.example .env.local
pnpm install
pnpm dev
```

La web queda disponible en `http://localhost:3000`. Configura `BACKEND_API_URL` o `INTERNAL_API_URL` en `.env.local` con la dirección de la API, normalmente `http://localhost:8080`.

## Desarrollo con Docker

Primero inicia la API desde el paquete `app/`. Después, desde esta carpeta:

```bash
docker compose up --build
```

El Compose usa `http://host.docker.internal:8080` para alcanzar la API que se ejecuta en el host. Puedes reemplazarlo con `BACKEND_API_URL` o `INTERNAL_API_URL` al ejecutar Docker Compose.

Para usar la plantilla **Cargar demo** de creación de proyectos, inicia el
entorno completo desde `app/` con `make demo-up` y después abre esta interfaz
en `http://localhost:3000`. Los pasos y las URLs de RabbitMQ y del receptor de eventos están en
[../app/docs/DEMO_PIPELINE.md](../app/docs/DEMO_PIPELINE.md).
