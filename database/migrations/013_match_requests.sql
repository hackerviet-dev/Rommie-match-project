-- "Xác nhận ghép thành công": a member invites another to be roommates and the other side
-- accepts or declines. Only an accepted request counts as a confirmed match.
--
-- Rows are never deleted by the app; every transition is a status change, so the history of
-- who invited whom stays readable (cancelled/declined/ended are the "soft delete" states).
--   pending   -> accepted  (recipient)    -> ended (either member)
--   pending   -> declined  (recipient)
--   pending   -> cancelled (requester)
-- A pair has at most one open request (pending or accepted) at a time, in either direction;
-- the unique index below enforces that even for two concurrent invitations.
-- Every statement is safe to run again.

CREATE TABLE IF NOT EXISTS match_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message text CHECK (message IS NULL OR length(message) <= 500),
    status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'ended')),
    responded_at timestamptz,
    ended_at timestamptz,
    ended_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT match_requests_not_self CHECK (requester_id <> recipient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_match_requests_open_pair
    ON match_requests (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id))
    WHERE status IN ('pending', 'accepted');

CREATE INDEX IF NOT EXISTS ix_match_requests_requester
    ON match_requests (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_match_requests_recipient
    ON match_requests (recipient_id, created_at DESC);

DROP TRIGGER IF EXISTS match_requests_set_updated_at ON match_requests;
CREATE TRIGGER match_requests_set_updated_at BEFORE UPDATE ON match_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
