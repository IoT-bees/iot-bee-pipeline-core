-- Ajusta la tabla data_sources al modelo de dominio actual.
-- SQLite no soporta alterar/renombrar columnas complejas en una sola operación,
-- por eso se recrea la tabla y se migra el contenido.

CREATE TABLE IF NOT EXISTS data_sources_new (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL UNIQUE,
	data_source_type_id INTEGER NOT NULL,
	data_source_state TEXT NOT NULL DEFAULT 'ACTIVE',
	data_source_configuration TEXT NOT NULL,
	data_source_description TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (data_source_type_id) REFERENCES connection_types(id)
);

INSERT INTO data_sources_new (
	name,
	data_source_type_id,
	data_source_configuration,
	data_source_description,
	created_at,
	updated_at
)
SELECT
	name,
	connection_type_id,
	config,
	'Migrated legacy data source',
	COALESCE(created_at, CURRENT_TIMESTAMP),
	COALESCE(created_at, CURRENT_TIMESTAMP)
FROM data_sources;

DROP TABLE data_sources;

ALTER TABLE data_sources_new RENAME TO data_sources;

CREATE INDEX IF NOT EXISTS idx_data_sources_data_source_type_id
ON data_sources(data_source_type_id);
