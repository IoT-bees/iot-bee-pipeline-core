# Pipeline de demo

El entorno local incluye una demo completa para comprobar el recorrido de un
mensaje: RabbitMQ publica telemetría mock, iot bees la valida y el receptor HTTP
local conserva los eventos aceptados.

## Servicios

Al ejecutar `make demo-up` (o `docker compose --profile demo up -d`) desde
`app/`, se levantan además del API:

- RabbitMQ, con panel en `http://localhost:15672`.
- Un emisor con escenarios variados cada tres segundos: entregas válidas y
  rechazos de validación.
- Una consola de publicación editable en `http://localhost:8091`.
- Un receptor de webhook en `http://localhost:8090/events`, que muestra tanto
  las entregas como los rechazos reales de validación.

## Uso

1. Inicia el frontend y abre `http://localhost:3000`. Consulta
   [la guía del frontend](../../web/README.md) si aún no está en marcha.
2. En `/pipelines/new`, selecciona **Cargar demo**.
3. Guarda la conexión, el esquema y el destino propuestos.
4. Crea el proyecto y, desde la lista de proyectos, pulsa **Iniciar**.
5. Consulta `http://localhost:8090/events` para ver el resumen, los mensajes
   entregados al destino y los rechazados con su motivo. Los rechazos no llegan
   al webhook porque el procesador los detiene antes de la entrega.
6. Abre `http://localhost:8091` para editar cualquier payload y publicarlo en
   RabbitMQ. El evento recibe un `event_id` y queda trazable hasta el resultado.
7. Abre `http://localhost:8090` y configura cuántas entregas deben responder
   `503`. Así puedes comprobar los reintentos del webhook y el error operativo
   del último tramo.

Los escenarios automáticos incluyen temperatura fuera de rango, humedad
imposible y un campo obligatorio ausente. También puedes enviar tus propios
casos desde la consola sin editar archivos ni reiniciar contenedores.

> Los proyectos de demo creados antes de esta mejora no incluyen `event_id` en
> su esquema y por eso el identificador no llega al webhook. Crea de nuevo la
> plantilla **Cargar demo** o añade ese campo `string` obligatorio al esquema
> para mantener la trazabilidad completa también en las entregas.

La URL de RabbitMQ y la del webhook usan los nombres internos de Docker, por lo
que esta plantilla está pensada para el API ejecutándose con el Compose de
`app/`.

## Detener la demo

Para detener el entorno completo y conservar los datos de PostgreSQL:

```bash
make demo-down
```
