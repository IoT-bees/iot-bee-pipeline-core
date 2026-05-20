-- Refactor de pipelines:
-- 1) Elimina relacion con pipeline_configs (config_id)
-- 2) Agrega relacion obligatoria con validation_schemas
-- 3) Ajusta status a INTEGER
-- 4) Agrega replicas como INTEGER
-- 5) Elimina tabla pipeline_configs / pipeline_config

-- Garantiza al menos un schema para asociar pipelines existentes.
INSERT OR IGNORE INTO validation_schemas (json_name, json_schema, created_at, updated_at)
VALUES (
    'default_pipeline_schema',
    '{}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

CREATE TABLE pipelines_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_id TEXT,
    db_id TEXT NOT NULL,
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
    p.id,
    p.name,
    p.group_id,
    p.db_id,
    CAST(p.data_source_id AS INTEGER),
    (SELECT id FROM validation_schemas ORDER BY id ASC LIMIT 1),
    COALESCE(pc.replicas, 1),
    CASE LOWER(COALESCE(p.status, ''))
        WHEN 'running' THEN 0
        WHEN 'stopped' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'failed' THEN 3
        ELSE 2
    END,
    p.created_at,
    p.updated_at
FROM pipelines p
LEFT JOIN pipeline_configs pc ON pc.id = p.config_id;

DROP TABLE pipelines;
ALTER TABLE pipelines_new RENAME TO pipelines;

DROP TABLE IF EXISTS pipeline_configs;
DROP TABLE IF EXISTS pipeline_config;

CREATE INDEX IF NOT EXISTS idx_pipelines_group_id ON pipelines(group_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
CREATE INDEX IF NOT EXISTS idx_pipelines_data_source_id ON pipelines(data_source_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_validation_schema_id ON pipelines(validation_schema_id);
