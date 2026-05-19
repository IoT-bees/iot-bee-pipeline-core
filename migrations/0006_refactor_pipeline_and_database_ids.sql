-- 0006_refactor_pipeline_and_database_ids.sql
-- Objetivos:
-- 1) databases.id -> INTEGER PRIMARY KEY AUTOINCREMENT
-- 2) databases.connection_string -> databases.json_schema
-- 3) pipelines.id -> INTEGER PRIMARY KEY AUTOINCREMENT
-- 4) pipelines.db_id -> INTEGER FK a databases(id)
-- 5) crear pipeline_migrations con id INTEGER unico y FK a pipelines(id)

-- Snapshot de databases para preservar orden de insercion y mapear IDs legacy -> nuevos.
CREATE TEMP TABLE databases_snapshot AS
SELECT
    ROW_NUMBER() OVER (ORDER BY rowid) AS seq,
    id AS old_id,
    name,
    type,
    connection_string,
    created_at
FROM databases;

CREATE TABLE databases_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    json_schema TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO databases_new (name, type, json_schema, created_at)
SELECT
    name,
    type,
    connection_string,
    COALESCE(created_at, CURRENT_TIMESTAMP)
FROM databases_snapshot
ORDER BY seq;

CREATE TEMP TABLE db_id_map (
    old_id TEXT PRIMARY KEY,
    new_id INTEGER NOT NULL UNIQUE
);

INSERT INTO db_id_map (old_id, new_id)
SELECT
    ds.old_id,
    dn.id
FROM databases_snapshot ds
JOIN databases_new dn ON dn.rowid = ds.seq;

-- Reemplaza databases respetando el nombre final esperado.
ALTER TABLE databases RENAME TO databases_old;
ALTER TABLE databases_new RENAME TO databases;

-- Snapshot de pipelines para migrar a ID entero y corregir FK db_id.
CREATE TEMP TABLE pipelines_snapshot AS
SELECT
    id AS old_id,
    name,
    group_id,
    db_id,
    data_source_id,
    validation_schema_id,
    replicas,
    status,
    created_at,
    updated_at
FROM pipelines;

CREATE TABLE pipelines_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    group_id TEXT,
    db_id INTEGER NOT NULL,
    data_source_id INTEGER NOT NULL,
    validation_schema_id INTEGER NOT NULL,
    replicas INTEGER NOT NULL DEFAULT 1,
    status INTEGER NOT NULL DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES pipeline_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (db_id) REFERENCES databases(id),
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id),
    FOREIGN KEY (validation_schema_id) REFERENCES validation_schemas(id)
);

INSERT INTO pipelines_new (
    name,
    group_id,
    db_id,
    data_source_id,
    validation_schema_id,
    replicas,
    status,
    created_at,
    updated_at
)
SELECT
    p.name,
    p.group_id,
    COALESCE(dm.new_id, (SELECT id FROM databases ORDER BY id ASC LIMIT 1)),
    CAST(p.data_source_id AS INTEGER),
    CAST(p.validation_schema_id AS INTEGER),
    COALESCE(p.replicas, 1),
    COALESCE(p.status, 2),
    COALESCE(p.created_at, CURRENT_TIMESTAMP),
    COALESCE(p.updated_at, CURRENT_TIMESTAMP)
FROM pipelines_snapshot p
LEFT JOIN db_id_map dm ON dm.old_id = p.db_id;

DROP TABLE pipelines;
ALTER TABLE pipelines_new RENAME TO pipelines;

DROP TABLE databases_old;

CREATE TABLE IF NOT EXISTS pipeline_migrations (
    id INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES pipelines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pipelines_group_id ON pipelines(group_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
CREATE INDEX IF NOT EXISTS idx_pipelines_data_source_id ON pipelines(data_source_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_validation_schema_id ON pipelines(validation_schema_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_db_id ON pipelines(db_id);
