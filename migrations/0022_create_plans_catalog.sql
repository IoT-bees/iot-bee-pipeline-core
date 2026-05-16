CREATE TABLE IF NOT EXISTS plans (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                        TEXT NOT NULL,
    organization_id             INTEGER,
    display_name                TEXT NOT NULL,
    description                 TEXT,
    price_cents                 INTEGER NOT NULL DEFAULT 0,
    currency                    TEXT NOT NULL DEFAULT 'USD',
    max_pipelines               INTEGER NOT NULL,
    max_replicas_per_pipeline   INTEGER NOT NULL,
    alerts_enabled              INTEGER NOT NULL DEFAULT 0,
    premium_connectors          INTEGER NOT NULL DEFAULT 0,
    multi_user                  INTEGER NOT NULL DEFAULT 0,
    is_custom                   INTEGER NOT NULL DEFAULT 0,
    stripe_price_id             TEXT,
    created_at                  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A plan is uniquely identified by (slug, organization_id). NULL org_id = global.
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug_org
    ON plans(slug, IFNULL(organization_id, -1));
CREATE INDEX IF NOT EXISTS idx_plans_organization_id ON plans(organization_id);

-- Seed the four built-in plans matching the previous enum defaults.
INSERT OR IGNORE INTO plans
    (slug, organization_id, display_name, price_cents, currency, max_pipelines, max_replicas_per_pipeline, alerts_enabled, premium_connectors, multi_user, is_custom)
VALUES
    ('free',       NULL, 'Free',       0,    'USD', 3,   2,  0, 0, 0, 0),
    ('starter',    NULL, 'Starter',    1900, 'USD', 10,  4,  0, 0, 0, 0),
    ('pro',        NULL, 'Pro',        9900, 'USD', 50,  16, 1, 1, 0, 0),
    ('enterprise', NULL, 'Enterprise', 49900,'USD', 250, 64, 1, 1, 1, 0);
