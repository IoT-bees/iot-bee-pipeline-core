-- Elimina la FK a connection_types y deja source_type como TEXT directo.
-- SQLite no soporta DROP COLUMN con FK, se recrea la tabla.

CREATE TABLE data_sources_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL,
    data_source_state TEXT NOT NULL DEFAULT 'ACTIVE',
    data_source_configuration TEXT NOT NULL,
    data_source_description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO data_sources_new (id, name, source_type, data_source_state, data_source_configuration, data_source_description, created_at, updated_at)
SELECT id, name, source_type, data_source_state, data_source_configuration, data_source_description, created_at, updated_at
FROM data_sources;

DROP TABLE data_sources;
ALTER TABLE data_sources_new RENAME TO data_sources;
