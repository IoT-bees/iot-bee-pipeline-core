-- Tabla de tipos de conexión
CREATE TABLE IF NOT EXISTS connection_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_type TEXT NOT NULL UNIQUE DEFAULT 'RABBITMQ'
);

-- Insertar el valor por defecto
INSERT OR IGNORE INTO connection_types (connection_type) VALUES ('RABBITMQ');
INSERT OR IGNORE INTO connection_types (connection_type) VALUES ('KAFKA');
INSERT OR IGNORE INTO connection_types (connection_type) VALUES ('MQTT');

-- Recrear data_sources sin "type" y con FK a connection_types
-- SQLite no soporta DROP COLUMN directamente, se recrea la tabla


CREATE TABLE IF NOT EXISTS data_sources_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    connection_type_id INTEGER NOT NULL DEFAULT 1,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_type_id) REFERENCES connection_types(id)
);

INSERT INTO data_sources_new (id, name, connection_type_id, config, created_at)
SELECT id, name, 1, config, created_at
FROM data_sources;

DROP TABLE data_sources;

ALTER TABLE data_sources_new RENAME TO data_sources;