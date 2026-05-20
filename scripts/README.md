# scripts/

Operational scripts for iot bees.

## SQLite backup & restore

`backup-sqlite.sh` y `restore-sqlite.sh` operan sobre la base SQLite que
usa el backend en runtime. Usan la API online de SQLite (`.backup`), por
lo que son seguros mientras el proceso esté corriendo: no bloquean
writers ni cierran el fichero.

### Backup

```bash
./scripts/backup-sqlite.sh [DB_PATH] [BACKUP_DIR] [RETENTION_DAYS]
```

Defaults (overridables vía args o vars de entorno):

- `DB_PATH` = `data/iot-bee.db` (env: `IOT_BEE_DB_PATH`)
- `BACKUP_DIR` = `backups` (env: `IOT_BEE_BACKUP_DIR`)
- `RETENTION_DAYS` = `14` (env: `IOT_BEE_BACKUP_RETENTION_DAYS`)

El script:

1. Hace `sqlite3 .backup` a un fichero temporal en `BACKUP_DIR`.
2. Ejecuta `PRAGMA integrity_check;` sobre la copia.
3. Comprime con gzip → `iot-bee-<UTC-timestamp>.db.gz`.
4. Borra ficheros `iot-bee-*.db.gz` con `mtime > RETENTION_DAYS` días.

Sugerencia de cron (cada hora):

```cron
0 * * * * cd /opt/iot-bee && ./scripts/backup-sqlite.sh >> backups/backup.log 2>&1
```

### Restore

```bash
./scripts/restore-sqlite.sh BACKUP_FILE.db.gz [DB_PATH]
```

El script:

1. Descomprime el backup a un fichero temporal.
2. Ejecuta `PRAGMA integrity_check;` sobre el contenido.
3. Si ya hay una base en `DB_PATH`, la copia a
   `DB_PATH.before-restore-<UTC-timestamp>` antes de sobreescribir.
4. Mueve la copia restaurada a `DB_PATH`.

Reinicia el backend después de restaurar para que abra el fichero nuevo.
