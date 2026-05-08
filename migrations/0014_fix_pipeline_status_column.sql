-- no-transaction
-- Cambia la columna status a INTEGER booleano (0=inactivo, 1=activo).
-- SQLite no soporta ALTER COLUMN, se recrea la tabla.
-- Requiere no-transaction para poder usar PRAGMA foreign_keys.

PRAGMA foreign_keys = OFF;

CREATE TABLE pipelines_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    group_id INTEGER,
    db_id INTEGER NOT NULL,
    data_source_id INTEGER NOT NULL,
    validation_schema_id INTEGER NOT NULL,
    replicas INTEGER NOT NULL DEFAULT 1,
    status INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES pipeline_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (db_id) REFERENCES databases(id),
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id),
    FOREIGN KEY (validation_schema_id) REFERENCES validation_schemas(id)
);

INSERT INTO pipelines_new (id, name, group_id, db_id, data_source_id, validation_schema_id, replicas, status, created_at, updated_at)
SELECT id, name, group_id, db_id, data_source_id, validation_schema_id, replicas, 0, created_at, updated_at
FROM pipelines;

DROP TABLE pipelines;
ALTER TABLE pipelines_new RENAME TO pipelines;

PRAGMA foreign_keys = ON;
