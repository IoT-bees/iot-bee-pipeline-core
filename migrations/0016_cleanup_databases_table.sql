-- Elimina la columna legacy `type` (integer), ya reemplazada por `store_type`.
-- Se usa ALTER TABLE DROP COLUMN (SQLite >= 3.35) para evitar recrear la tabla
-- y los problemas con la FK de pipelines.db_id -> databases.id.

ALTER TABLE databases DROP COLUMN type;
