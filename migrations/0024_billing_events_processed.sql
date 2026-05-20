ALTER TABLE billing_events ADD COLUMN processed_ok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE billing_events ADD COLUMN last_error TEXT;
