-- Refunds that a person has to carry out. payOS has no refund API for an order that was already
-- paid, so the buyer files a request and an admin sends the money back by bank transfer, then
-- records the transfer here. The payment only becomes 'refunded' (and loses its Premium months)
-- once an admin approves the request.
--
--   pending -> approved (admin sent the money back; the payment is now refunded)
--   pending -> rejected (admin refused; the buyer may ask again while the window is open)
-- Rows are never deleted by the app, so the refund history of an order stays readable.
-- A payment has at most one open (pending or approved) request; the unique index enforces that
-- even for two concurrent requests. Every statement is safe to run again.

CREATE TABLE IF NOT EXISTS payment_refund_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason text CHECK (reason IS NULL OR length(reason) <= 1000),
    status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    -- The bank transfer that sent the money back; required to approve.
    transfer_reference text CHECK (transfer_reference IS NULL OR length(transfer_reference) <= 200),
    resolution_note text CHECK (resolution_note IS NULL OR length(resolution_note) <= 2000),
    resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_refund_requests_open
    ON payment_refund_requests (payment_id)
    WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS ix_payment_refund_requests_status_created
    ON payment_refund_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_payment_refund_requests_payment_created
    ON payment_refund_requests (payment_id, created_at DESC);

DROP TRIGGER IF EXISTS payment_refund_requests_set_updated_at ON payment_refund_requests;
CREATE TRIGGER payment_refund_requests_set_updated_at BEFORE UPDATE ON payment_refund_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
