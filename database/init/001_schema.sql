CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(320) NOT NULL UNIQUE,
    role varchar(30) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    auth_provider varchar(30) NOT NULL DEFAULT 'local',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name varchar(120) NOT NULL,
    birth_date date,
    gender varchar(30),
    occupation varchar(120),
    bio text,
    city varchar(100) NOT NULL,
    district varchar(100),
    avatar_url text,
    is_verified boolean NOT NULL DEFAULT false,
    profile_completion smallint NOT NULL DEFAULT 0 CHECK (profile_completion BETWEEN 0 AND 100),
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
    amenities text[] NOT NULL DEFAULT '{}',
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    is_active boolean NOT NULL DEFAULT true,
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
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at timestamptz NOT NULL DEFAULT now(),
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
