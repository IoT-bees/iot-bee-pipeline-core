-- 0008_fix_database_group_and_pipeline_fk_types.sql
-- Ajustes finales solicitados:
-- 1) databases.id como INTEGER y columna json_schema
-- 2) pipeline_groups.id como INTEGER
-- 3) pipelines.id como INTEGER y FKs alineadas a INTEGER para group_id y db_id

-- Rebuild de databases para garantizar estructura final.
CREATE TEMP TABLE databases_snapshot AS
SELECT
    ROW_NUMBER() OVER (ORDER BY rowid) AS seq,
    CAST(id AS TEXT) AS old_id,
    name,
    type,
    json_schema,
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
    json_schema,
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

ALTER TABLE databases RENAME TO databases_old;
ALTER TABLE databases_new RENAME TO databases;

-- Rebuild de pipeline_groups para garantizar id INTEGER.
CREATE TEMP TABLE pipeline_groups_snapshot AS
SELECT
    ROW_NUMBER() OVER (ORDER BY rowid) AS seq,
    CAST(id AS TEXT) AS old_id,
    name,
    description,
    created_at,
    updated_at
FROM pipeline_groups;

CREATE TABLE pipeline_groups_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pipeline_groups_new (name, description, created_at, updated_at)
SELECT
    name,
    description,
    COALESCE(created_at, CURRENT_TIMESTAMP),
    COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM pipeline_groups_snapshot
ORDER BY seq;

CREATE TEMP TABLE pipeline_group_id_map (
    old_id TEXT PRIMARY KEY,
    new_id INTEGER NOT NULL UNIQUE
);

INSERT INTO pipeline_group_id_map (old_id, new_id)
SELECT
    pgs.old_id,
    pgn.id
FROM pipeline_groups_snapshot pgs
JOIN pipeline_groups_new pgn ON pgn.rowid = pgs.seq;

ALTER TABLE pipeline_groups RENAME TO pipeline_groups_old;
ALTER TABLE pipeline_groups_new RENAME TO pipeline_groups;

-- Rebuild de pipelines para alinear id y relaciones a INTEGER.
CREATE TABLE pipelines_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    group_id INTEGER,
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
    id,
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
    CAST(p.id AS INTEGER),
    p.name,
    CAST(gm.new_id AS INTEGER),
    CAST(COALESCE(dm.new_id, (SELECT id FROM databases ORDER BY id ASC LIMIT 1)) AS INTEGER),
    CAST(p.data_source_id AS INTEGER),
    CAST(p.validation_schema_id AS INTEGER),
    COALESCE(p.replicas, 1),
    COALESCE(p.status, 2),
    COALESCE(p.created_at, CURRENT_TIMESTAMP),
    COALESCE(p.updated_at, CURRENT_TIMESTAMP)
FROM pipelines p
LEFT JOIN db_id_map dm ON dm.old_id = CAST(p.db_id AS TEXT)
LEFT JOIN pipeline_group_id_map gm ON gm.old_id = CAST(p.group_id AS TEXT);

DROP TABLE pipelines;
ALTER TABLE pipelines_new RENAME TO pipelines;

DROP TABLE databases_old;
DROP TABLE pipeline_groups_old;

CREATE INDEX IF NOT EXISTS idx_pipelines_group_id ON pipelines(group_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
CREATE INDEX IF NOT EXISTS idx_pipelines_data_source_id ON pipelines(data_source_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_validation_schema_id ON pipelines(validation_schema_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_db_id ON pipelines(db_id);
