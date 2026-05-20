-- migrations/XXXXXX_add_unique_constraint_to_json_name.sql
-- Crear índice único en la columna json_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_json_name 
ON validation_schemas(json_name);-- Add migration script here
