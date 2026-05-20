-- migrations/001_initial.sql

-- Tabla de grupos de pipelines
CREATE TABLE IF NOT EXISTS pipeline_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuraciones de pipelines
CREATE TABLE IF NOT EXISTS pipeline_configs (
    id TEXT PRIMARY KEY,
    replicas INTEGER NOT NULL DEFAULT 1,
    schedule TEXT,
    other_settings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de bases de datos destino
CREATE TABLE IF NOT EXISTS databases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    connection_string TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de fuentes de datos
CREATE TABLE IF NOT EXISTS data_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla principal de pipelines
CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_id TEXT,
    config_id TEXT NOT NULL,
    db_id TEXT NOT NULL,
    data_source_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'configured',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES pipeline_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (config_id) REFERENCES pipeline_configs(id),
    FOREIGN KEY (db_id) REFERENCES databases(id),
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
);

-- Tabla de esquemas de validación
CREATE TABLE IF NOT EXISTS validation_schemas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    json_name TEXT NOT NULL,
    json_schema TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pipelines_group_id ON pipelines(group_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);


