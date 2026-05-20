-- Hace que pipelines.name tenga afinidad TEXT y agrega unicidad.
-- En SQLite no se puede alterar tipo/constraint de columna directamente,
-- por eso se reconstruye la tabla.

CREATE TABLE pipelines_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
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
WITH ranked_pipelines AS (
    SELECT
        CAST(id AS INTEGER) AS id,
        CAST(name AS TEXT) AS name,
        group_id,
        db_id,
        data_source_id,
        validation_schema_id,
        replicas,
        status,
        created_at,
        updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY CAST(name AS TEXT)
            ORDER BY CAST(id AS INTEGER)
        ) AS row_num
    FROM pipelines
)
SELECT
    id,
    CASE
        WHEN row_num = 1 THEN name
        ELSE name || '__dup_' || id
    END,
    group_id,
    db_id,
    data_source_id,
    validation_schema_id,
    replicas,
    status,
    created_at,
    updated_at
FROM ranked_pipelines;

DROP TABLE pipelines;
ALTER TABLE pipelines_new RENAME TO pipelines;

CREATE INDEX IF NOT EXISTS idx_pipelines_group_id ON pipelines(group_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
CREATE INDEX IF NOT EXISTS idx_pipelines_data_source_id ON pipelines(data_source_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_validation_schema_id ON pipelines(validation_schema_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_db_id ON pipelines(db_id);
