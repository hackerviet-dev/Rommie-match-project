-- One row per checkout attempt. Plan price is copied in at creation time so later
-- price changes never rewrite what a user was actually charged.
-- Fresh volumes already get this table from 001_schema.sql.
CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_code varchar(40) NOT NULL,
    amount integer NOT NULL CHECK (amount >= 0),
    currency varchar(3) NOT NULL DEFAULT 'VND',
    provider varchar(30) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
    provider_transaction_id text,
    subscription_id uuid REFERENCES subscriptions(id),
    expires_at timestamptz NOT NULL,
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_payments_user_created ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_subscriptions_user_ends ON subscriptions(user_id, ends_at DESC);

DROP TRIGGER IF EXISTS payments_set_updated_at ON payments;
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
