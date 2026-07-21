# scripts/

Operational scripts for iot bees.

## Base de datos PostgreSQL

iot bees usa PostgreSQL como único almacén interno. Los respaldos y las
restauraciones deben ejecutarse con la política de la instancia PostgreSQL
gestionada o con `pg_dump` y `pg_restore`; no hay ficheros de base de datos
locales que copiar o restaurar.
