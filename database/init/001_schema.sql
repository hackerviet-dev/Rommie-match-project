CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(320) NOT NULL UNIQUE,
    password_hash text,
    role varchar(30) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    auth_provider varchar(30) NOT NULL DEFAULT 'local',
    is_active boolean NOT NULL DEFAULT true,
    -- Bumped on "log out everywhere" and password change; access tokens carry the
    -- value they were issued with, so a bump invalidates them immediately.
    token_version integer NOT NULL DEFAULT 0,
    two_factor_enabled boolean NOT NULL DEFAULT false,
    two_factor_secret text,
    two_factor_recovery_code_hashes text[] NOT NULL DEFAULT '{}',
    google_subject varchar(255),
    last_seen_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_google_subject
    ON users(google_subject) WHERE google_subject IS NOT NULL;

CREATE TABLE IF NOT EXISTS profiles (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name varchar(120) NOT NULL,
    birth_date date,
    -- Onboarding asks for age; the year is stored so it does not go stale.
    -- birth_date, when present, wins.
    birth_year smallint CHECK (birth_year BETWEEN 1900 AND 2100),
    gender varchar(30) CONSTRAINT profiles_gender_check CHECK (gender IN ('male', 'female', 'other')),
    occupation varchar(120),
    occupation_status varchar(20) CHECK (occupation_status IN ('student', 'employed', 'both', 'other')),
    organization_name varchar(160),
    hide_organization boolean NOT NULL DEFAULT false,
    preferred_roommate_gender varchar(10) NOT NULL DEFAULT 'any'
        CHECK (preferred_roommate_gender IN ('male', 'female', 'any')),
    has_room boolean,
    bio text,
    city varchar(100) NOT NULL,
    district varchar(100),
    avatar_url text,
    is_verified boolean NOT NULL DEFAULT false,
    profile_completion smallint NOT NULL DEFAULT 0 CHECK (profile_completion BETWEEN 0 AND 100),
    is_public boolean NOT NULL DEFAULT true,
    show_online_status boolean NOT NULL DEFAULT true,
    hide_age boolean NOT NULL DEFAULT false,
    onboarding_completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifestyle_preferences (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sleep_schedule varchar(40) NOT NULL,
    cleanliness smallint NOT NULL CHECK (cleanliness BETWEEN 1 AND 5),
    social_style varchar(40) NOT NULL,
    smoking boolean NOT NULL DEFAULT false,
    pet_friendly boolean NOT NULL DEFAULT false,
    drinking boolean NOT NULL DEFAULT false,
    -- Feeds the "Chịu ồn" (noise tolerance) score.
    room_environment varchar(20) CHECK (room_environment IN ('quiet', 'moderate', 'lively')),
    extroversion smallint CHECK (extroversion BETWEEN 0 AND 100),
    preferred_distance varchar(20) CHECK (preferred_distance IN ('lt_2km', '2_5km', '5_10km', 'anywhere')),
    preferred_room_type varchar(20)
        CHECK (preferred_room_type IN ('private', 'shared', 'studio', 'whole_apartment')),
    cooking_frequency varchar(40),
    budget_min integer NOT NULL CHECK (budget_min >= 0),
    budget_max integer NOT NULL CHECK (budget_max >= budget_min),
    move_in_date date,
    interests text[] NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title varchar(180) NOT NULL,
    description text,
    address text NOT NULL,
    district varchar(100) NOT NULL,
    city varchar(100) NOT NULL,
    monthly_rent integer NOT NULL CHECK (monthly_rent >= 0),
    deposit integer NOT NULL DEFAULT 0 CHECK (deposit >= 0),
    available_from date NOT NULL,
    max_occupants smallint NOT NULL DEFAULT 2 CHECK (max_occupants > 0),
    property_type varchar(20) CHECK (property_type IN ('apartment', 'house', 'studio', 'dormitory')),
    bedrooms smallint CHECK (bedrooms > 0),
    area_m2 numeric(6, 1) CHECK (area_m2 > 0),
    roommates_needed smallint CHECK (roommates_needed > 0),
    amenities text[] NOT NULL DEFAULT '{}',
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    is_active boolean NOT NULL DEFAULT true,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matching_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_score smallint NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    breakdown jsonb NOT NULL DEFAULT '{}',
    explanation text,
    calculated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT matching_scores_not_self CHECK (user_id <> candidate_user_id),
    CONSTRAINT matching_scores_unique_pair UNIQUE (user_id, candidate_user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- "<smaller uuid>:<larger uuid>" for 1:1 conversations.
    direct_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at timestamptz NOT NULL DEFAULT now(),
    last_read_at timestamptz,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 4000),
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz
);

CREATE TABLE IF NOT EXISTS local_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category varchar(80) NOT NULL,
    name varchar(160) NOT NULL,
    description text,
    phone varchar(30),
    district varchar(100) NOT NULL,
    city varchar(100) NOT NULL,
    distance_km numeric(5, 2) NOT NULL CHECK (distance_km >= 0),
    rating numeric(2, 1) NOT NULL CHECK (rating BETWEEN 0 AND 5),
    review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    price_from integer NOT NULL DEFAULT 0 CHECK (price_from >= 0),
    is_verified boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan varchar(30) NOT NULL CHECK (plan IN ('free', 'premium')),
    status varchar(30) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
    starts_at timestamptz NOT NULL DEFAULT now(),
    ends_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_code varchar(40) NOT NULL,
    amount integer NOT NULL CHECK (amount >= 0),
    currency varchar(3) NOT NULL DEFAULT 'VND',
    provider varchar(30) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded')),
    provider_transaction_id text,
    -- payOS (and providers like it) identify an order by a code of their own in the callback.
    provider_order_code bigint,
    subscription_id uuid REFERENCES subscriptions(id),
    expires_at timestamptz NOT NULL,
    paid_at timestamptz,
    refunded_at timestamptz,
    refund_reason text,
    provider_refund_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_payments_user_created ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_subscriptions_user_ends ON subscriptions(user_id, ends_at DESC);
-- One provider order code belongs to exactly one payment, so a replayed callback cannot be
-- pointed at someone else's order.
CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_provider_order_code
    ON payments(provider, provider_order_code)
    WHERE provider_order_code IS NOT NULL;

-- Hands out provider order codes so they are unique across app instances and stay far below the
-- 2^53 ceiling JavaScript can hold. 1000000 is clear of payOS's sample 123.
CREATE SEQUENCE IF NOT EXISTS payments_provider_order_code_seq START WITH 1000000;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    replaced_by_token_hash text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_active
    ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS user_settings (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notify_new_match boolean NOT NULL DEFAULT true,
    notify_messages boolean NOT NULL DEFAULT true,
    notify_profile_views boolean NOT NULL DEFAULT true,
    notify_promotions boolean NOT NULL DEFAULT false,
    language varchar(5) NOT NULL DEFAULT 'vi' CHECK (language IN ('vi', 'en', 'ja')),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Removing a saved profile or a block is a soft delete; saving or blocking again
-- revives the same row.
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

CREATE INDEX IF NOT EXISTS ix_user_blocks_blocked_active
    ON user_blocks(blocked_id) WHERE deleted_at IS NULL;

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

-- One row per viewer, viewed user and day.
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

CREATE UNIQUE INDEX IF NOT EXISTS ux_conversations_direct_key
    ON conversations(direct_key) WHERE direct_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_conversation_members_user ON conversation_members(user_id);

-- Cancelling a booking is a status change, never a delete.
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
CREATE INDEX IF NOT EXISTS ix_profiles_location ON profiles(city, district);
CREATE INDEX IF NOT EXISTS ix_rooms_location_active ON rooms(city, district, is_active);
CREATE INDEX IF NOT EXISTS ix_matching_scores_user_score ON matching_scores(user_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_local_services_location ON local_services(city, district, category);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS rooms_set_updated_at ON rooms;
CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS conversations_set_updated_at ON conversations;
CREATE TRIGGER conversations_set_updated_at BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS payments_set_updated_at ON payments;
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
