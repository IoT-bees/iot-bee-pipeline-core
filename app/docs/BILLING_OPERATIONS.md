# Operación de billing

## Eventos fallidos de Stripe

El webhook verifica su firma antes de llamar al backend. El backend guarda un
registro idempotente por `stripe_event_id` y organización. Para permitir
recuperación sin guardar el webhook completo, el registro conserva solamente
el estado normalizado de la suscripción que se necesita para volver a aplicar
la sincronización.

Un administrador de la organización puede inspeccionar los eventos con
`GET /admin/billing/events` y reintentar uno con
`POST /admin/billing/events/{id}/retry`. Ambas rutas están aisladas por
organización: un administrador no puede leer ni reintentar eventos de otra.

Procedimiento mínimo:

1. En Stripe, confirmar el estado real de la suscripción y que el webhook fue
   enviado al endpoint configurado.
2. En el control plane, abrir **Administración → Eventos de facturación**,
   revisar `lastError` y reintentar el evento pendiente.
3. Confirmar en el estado de licencia que el plan, la suscripción y las
   restricciones reflejan Stripe.
4. Si vuelve a fallar, conservar el ID del evento de Stripe y escalarlo con el
   mensaje de error; no copiar tokens, cabeceras de autorización ni secretos.

La aplicación no implementa ni opera backups. Antes del piloto, Operaciones
debe definir y probar un respaldo restaurable de la base PostgreSQL, incluyendo
`license_subscriptions` y `billing_events`, y custodiar fuera de la base las
variables de Stripe. La restauración se valida primero en un entorno aislado;
después se reenvían los eventos desde Stripe o se usan los reintentos del
control plane.
