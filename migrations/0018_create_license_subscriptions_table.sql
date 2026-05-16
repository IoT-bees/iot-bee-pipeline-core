CREATE TABLE license_subscriptions (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    license_key     TEXT NOT NULL,
    plan            TEXT NOT NULL,
    state           TEXT NOT NULL,
    activated_at    TEXT NOT NULL,
    expires_at      TEXT,
    last_checked_at TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

