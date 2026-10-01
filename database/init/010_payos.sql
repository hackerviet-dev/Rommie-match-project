-- payOS checkout. The provider calls back with an order code of its own, which is what the
-- webhook uses to find the payment row. Already part of 001_schema.sql for fresh volumes; this
-- file upgrades a volume that was created before payOS existed and is safe to re-run.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_order_code bigint;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_provider_order_code
    ON payments(provider, provider_order_code)
    WHERE provider_order_code IS NOT NULL;
