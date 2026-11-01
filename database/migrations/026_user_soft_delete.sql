-- Account deletion from the admin workspace happens in two steps.
-- 1. Soft delete stamps users.deleted_at. It is kept apart from is_active, which means
--    "locked by staff": a locked account can be unlocked, a deleted one must be restored,
--    and every read that gates on is_active also filters deleted_at IS NULL.
-- 2. Hard delete (only for rows already soft deleted) removes the users row; the
--    existing ON DELETE CASCADE / SET NULL rules clean up the member's data.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- These two were created without an ON DELETE rule, so hard deleting a staff account that
-- had reviewed a report or a verification failed with 23503. Keep the review, drop the link.
ALTER TABLE user_reports DROP CONSTRAINT IF EXISTS user_reports_reviewed_by_fkey;
ALTER TABLE user_reports ADD CONSTRAINT user_reports_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE identity_verifications DROP CONSTRAINT IF EXISTS identity_verifications_reviewed_by_fkey;
ALTER TABLE identity_verifications ADD CONSTRAINT identity_verifications_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
