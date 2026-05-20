-- Add organization_id to resource tables. Default to 1 (the implicit single tenant)
-- so existing rows remain reachable. New rows must provide an explicit org_id.
--
-- SQLite cannot ADD COLUMN with both REFERENCES and a non-NULL DEFAULT (see
-- "Cannot add a REFERENCES column with non-NULL default value"), so the FK to
-- organizations(id) is enforced at the application layer (see use cases).

ALTER TABLE data_sources ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE databases ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE validation_schemas ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pipeline_groups ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pipelines ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_data_sources_org ON data_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_databases_org ON databases(organization_id);
CREATE INDEX IF NOT EXISTS idx_validation_schemas_org ON validation_schemas(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_groups_org ON pipeline_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_org ON pipelines(organization_id);
