-- Product feedback from members (bugs, suggestions, praise). Unlike user_reports it is not
-- about another member, so moderators only read it and mark it reviewed with a note.
-- The sender is kept as SET NULL so feedback survives account deletion.
CREATE TABLE IF NOT EXISTS user_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    category varchar(20) NOT NULL
        CHECK (category IN ('bug', 'suggestion', 'praise', 'other')),
    rating smallint CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 2000),
    page_path text CHECK (page_path IS NULL OR length(page_path) <= 300),
    status varchar(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'reviewed')),
    staff_note text CHECK (staff_note IS NULL OR length(staff_note) <= 2000),
    reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_user_feedback_status_created ON user_feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_user_feedback_user ON user_feedback(user_id, created_at DESC);
