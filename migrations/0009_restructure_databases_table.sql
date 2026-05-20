-- Reestructura la tabla databases para alinearla con el repositorio de data_store.
-- Estructura objetivo:
-- - id INTEGER PRIMARY KEY AUTOINCREMENT
-- - name TEXT NOT NULL UNIQUE
-- - type INTEGER NOT NULL
-- - json_schema TEXT NOT NULL
-- - created_at TEXT NOT NULL
-- - updated_at TEXT NOT NULL

CREATE TABLE databases_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type INTEGER NOT NULL,
    json_schema TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO databases_new (
    id,
    name,
    type,
    json_schema,
    created_at,
    updated_at
)
SELECT
    CAST(id AS INTEGER),
    name,
    CAST(type AS INTEGER),
    json_schema,
    COALESCE(CAST(created_at AS TEXT), CURRENT_TIMESTAMP),
    COALESCE(CAST(created_at AS TEXT), CURRENT_TIMESTAMP)
FROM databases;

DROP TABLE databases;
ALTER TABLE databases_new RENAME TO databases;
