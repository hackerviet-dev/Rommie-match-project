-- Existing listings retain visibility; newly created/edited listings require review.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending','approved','rejected'));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS moderation_note text;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE rooms ALTER COLUMN moderation_status SET DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS housing_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(160) NOT NULL,
 room_id uuid UNIQUE REFERENCES rooms(id) ON DELETE SET NULL,
 created_by uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS housing_group_members (
 group_id uuid REFERENCES housing_groups(id) ON DELETE CASCADE,
 user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('owner','manager','member')),
 status text NOT NULL CHECK (status IN ('invited','active')),
 joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(group_id,user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_housing_group_owner ON housing_group_members(group_id) WHERE role='owner';
CREATE TABLE IF NOT EXISTS disputes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 complainant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 respondent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
 group_id uuid REFERENCES housing_groups(id) ON DELETE SET NULL,
 title varchar(180) NOT NULL, details text NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
 resolution_note text, reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(complainant_id<>respondent_id)
);
CREATE TABLE IF NOT EXISTS dispute_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dispute_id uuid REFERENCES disputes(id) ON DELETE CASCADE,
 author_id uuid REFERENCES users(id) ON DELETE SET NULL, content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS staff_audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action text NOT NULL, target_id uuid NOT NULL, note text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_disputes_status ON disputes(status,created_at DESC);
CREATE INDEX IF NOT EXISTS ix_staff_audit_created ON staff_audit_logs(created_at DESC);
