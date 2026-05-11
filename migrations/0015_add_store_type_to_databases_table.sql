-- Agrega columna store_type a la tabla databases.
-- El valor se infiere del tipo integer ya existente:
--   type = 1 → INFLUX_DB
--   type = 2 → LOCAL_LOG
ALTER TABLE databases ADD COLUMN store_type TEXT NOT NULL DEFAULT '';

UPDATE databases SET store_type = CASE type
    WHEN 1 THEN 'INFLUX_DB'
    WHEN 2 THEN 'LOCAL_LOG'
    ELSE 'INFLUX_DB'
END;
