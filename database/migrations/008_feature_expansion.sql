-- Schema for the onboarding, privacy, safety, quiz, chat REST, room details, service
-- booking, refund and admin-review features.
-- Fresh volumes already get all of this from 001_schema.sql; every statement here is
-- written to be a no-op on such a database.

-- ---------------------------------------------------------------------------
-- users: session revocation, 2FA, Google sign-in, presence
-- ---------------------------------------------------------------------------

-- Bumped on "log out everywhere" and password change. Access tokens carry the value
-- they were issued with, so a bump invalidates them immediately, not at expiry.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_recovery_code_hashes text[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_subject varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_google_subject
    ON users(google_subject) WHERE google_subject IS NOT NULL;

-- ---------------------------------------------------------------------------
-- profiles: onboarding fields, roommate gender preference, privacy switches
-- ---------------------------------------------------------------------------

-- Gender becomes a code so it can be compared with preferred_roommate_gender.
-- Existing free-text values ("Nam", "Nữ", ...) are mapped; anything else is "other".
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
UPDATE profiles SET gender = CASE
        WHEN lower(btrim(gender)) IN ('nam', 'male', 'm') THEN 'male'
        WHEN lower(btrim(gender)) IN ('nữ', 'nu', 'female', 'f') THEN 'female'
        ELSE 'other'
    END
WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female', 'other');
ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check
    CHECK (gender IN ('male', 'female', 'other'));

-- Onboarding asks for age, not a birth date. The year is stored instead of the age so
-- it does not go stale; birth_date, when present, still wins.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year smallint
    CHECK (birth_year BETWEEN 1900 AND 2100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation_status varchar(20)
    CHECK (occupation_status IN ('student', 'employed', 'both', 'other'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_name varchar(160);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_organization boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_roommate_gender varchar(10) NOT NULL DEFAULT 'any'
    CHECK (preferred_roommate_gender IN ('male', 'female', 'any'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_room boolean;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_online_status boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_age boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- lifestyle_preferences: onboarding step 2 and "no room yet" step 4
-- ---------------------------------------------------------------------------

ALTER TABLE lifestyle_preferences ADD COLUMN IF NOT EXISTS drinking boolean NOT NULL DEFAULT false;
-- Feeds the "Chịu ồn" (noise tolerance) score.
ALTER TABLE lifestyle_preferences ADD COLUMN IF NOT EXISTS room_environment varchar(20)
    CHECK (room_environment IN ('quiet', 'moderate', 'lively'));
ALTER TABLE lifestyle_preferences ADD COLUMN IF NOT EXISTS extroversion smallint
    CHECK (extroversion BETWEEN 0 AND 100);
ALTER TABLE lifestyle_preferences ADD COLUMN IF NOT EXISTS preferred_distance varchar(20)
    CHECK (preferred_distance IN ('lt_2km', '2_5km', '5_10km', 'anywhere'));
ALTER TABLE lifestyle_preferences ADD COLUMN IF NOT EXISTS preferred_room_type varchar(20)
    CHECK (preferred_room_type IN ('private', 'shared', 'studio', 'whole_apartment'));

-- ---------------------------------------------------------------------------
-- user_settings: notification switches and language (one row per user, lazy)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_settings (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notify_new_match boolean NOT NULL DEFAULT true,
    notify_messages boolean NOT NULL DEFAULT true,
    notify_profile_views boolean NOT NULL DEFAULT true,
    notify_promotions boolean NOT NULL DEFAULT false,
    language varchar(5) NOT NULL DEFAULT 'vi' CHECK (language IN ('vi', 'en', 'ja')),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Saved profiles and blocks. Removing either is a soft delete; saving or blocking
-- again revives the same row.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS saved_profiles (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    saved_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    PRIMARY KEY (user_id, saved_user_id),
    CONSTRAINT saved_profiles_not_self CHECK (user_id <> saved_user_id)
);

CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);

-- Blocks are checked in both directions, so the reverse lookup needs its own index.
CREATE INDEX IF NOT EXISTS ix_user_blocks_blocked_active
    ON user_blocks(blocked_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Reports and identity verification (reviewed by admin/moderator)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason varchar(20) NOT NULL
        CHECK (reason IN ('fake', 'scam', 'harass', 'sexual', 'spam', 'underage', 'other')),
    details text CHECK (details IS NULL OR length(details) <= 2000),
    status varchar(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'resolved', 'dismissed')),
    resolution_note text,
    reviewed_by uuid REFERENCES users(id),
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_reports_not_self CHECK (reporter_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS ix_user_reports_status_created ON user_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_user_reports_reported ON user_reports(reported_user_id);

-- Only image references and the last four digits are kept; the full CCCD number is
-- never stored.
CREATE TABLE IF NOT EXISTS identity_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type varchar(10) NOT NULL DEFAULT 'cccd' CHECK (document_type IN ('cccd', 'cmnd')),
    document_number_last4 varchar(4) NOT NULL CHECK (document_number_last4 ~ '^[0-9]{4}$'),
    front_image_url text NOT NULL,
    back_image_url text NOT NULL,
    selfie_image_url text,
    status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason text,
    reviewed_by uuid REFERENCES users(id),
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_identity_verifications_one_pending
    ON identity_verifications(user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_identity_verifications_status_created
    ON identity_verifications(status, created_at);

-- ---------------------------------------------------------------------------
-- Profile views (one row per viewer, viewed user and day) and notifications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profile_views (
    viewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    view_date date NOT NULL DEFAULT CURRENT_DATE,
    last_viewed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (viewer_id, viewed_user_id, view_date),
    CONSTRAINT profile_views_not_self CHECK (viewer_id <> viewed_user_id)
);

CREATE INDEX IF NOT EXISTS ix_profile_views_viewed_recent
    ON profile_views(viewed_user_id, last_viewed_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type varchar(40) NOT NULL,
    title varchar(200) NOT NULL,
    body text,
    data jsonb NOT NULL DEFAULT '{}',
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_notifications_user_unread
    ON notifications(user_id) WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- Matching: quiz answers, scan quota log, boosts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quiz_responses (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_code varchar(40) NOT NULL,
    answers jsonb NOT NULL,
    result jsonb NOT NULL DEFAULT '{}',
    completed_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, quiz_code)
);

-- One row per recalculation, so the free tier's monthly scan limit can be counted.
CREATE TABLE IF NOT EXISTS matching_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidates_scored integer NOT NULL DEFAULT 0 CHECK (candidates_scored >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_matching_runs_user_created ON matching_runs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS profile_boosts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starts_at timestamptz NOT NULL DEFAULT now(),
    ends_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT profile_boosts_valid_window CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS ix_profile_boosts_user_ends ON profile_boosts(user_id, ends_at DESC);

-- ---------------------------------------------------------------------------
-- Chat: one direct conversation per pair, per-member read marker
-- ---------------------------------------------------------------------------

-- "<smaller uuid>:<larger uuid>" for 1:1 conversations; the unique index stops two
-- concurrent "start chat" requests from creating duplicate conversations.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS direct_key text;
CREATE UNIQUE INDEX IF NOT EXISTS ux_conversations_direct_key
    ON conversations(direct_key) WHERE direct_key IS NOT NULL;

ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS last_read_at timestamptz;
CREATE INDEX IF NOT EXISTS ix_conversation_members_user ON conversation_members(user_id);

-- ---------------------------------------------------------------------------
-- Rooms: details collected by onboarding and the room editor
-- ---------------------------------------------------------------------------

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS property_type varchar(20)
    CHECK (property_type IN ('apartment', 'house', 'studio', 'dormitory'));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bedrooms smallint CHECK (bedrooms > 0);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS area_m2 numeric(6, 1) CHECK (area_m2 > 0);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS roommates_needed smallint CHECK (roommates_needed > 0);

-- ---------------------------------------------------------------------------
-- Local service bookings. Cancelling is a status change, never a delete.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES local_services(id),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_at timestamptz NOT NULL,
    address text NOT NULL,
    contact_phone varchar(30) NOT NULL,
    note text CHECK (note IS NULL OR length(note) <= 1000),
    status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    cancelled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_service_bookings_user_created ON service_bookings(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Billing: refunds within 7 days of payment
-- ---------------------------------------------------------------------------

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_refund_id text;

-- ---------------------------------------------------------------------------
-- updated_at triggers for the new tables
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS user_settings_set_updated_at ON user_settings;
CREATE TRIGGER user_settings_set_updated_at BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS user_reports_set_updated_at ON user_reports;
CREATE TRIGGER user_reports_set_updated_at BEFORE UPDATE ON user_reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS identity_verifications_set_updated_at ON identity_verifications;
CREATE TRIGGER identity_verifications_set_updated_at BEFORE UPDATE ON identity_verifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS quiz_responses_set_updated_at ON quiz_responses;
CREATE TRIGGER quiz_responses_set_updated_at BEFORE UPDATE ON quiz_responses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS service_bookings_set_updated_at ON service_bookings;
CREATE TRIGGER service_bookings_set_updated_at BEFORE UPDATE ON service_bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
