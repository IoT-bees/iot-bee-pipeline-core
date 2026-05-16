ALTER TABLE license_subscriptions ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE license_subscriptions ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE license_subscriptions ADD COLUMN stripe_checkout_session_id TEXT;
ALTER TABLE license_subscriptions ADD COLUMN stripe_subscription_status TEXT;
ALTER TABLE license_subscriptions ADD COLUMN stripe_payment_status TEXT;
ALTER TABLE license_subscriptions ADD COLUMN current_period_end TEXT;
ALTER TABLE license_subscriptions ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
ALTER TABLE license_subscriptions ADD COLUMN latest_invoice_id TEXT;
ALTER TABLE license_subscriptions ADD COLUMN amount_cents INTEGER;
ALTER TABLE license_subscriptions ADD COLUMN currency TEXT;

CREATE TABLE billing_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type      TEXT NOT NULL,
    payload         TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
