ALTER TABLE rooms ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE housing_group_members ADD COLUMN IF NOT EXISTS share_room_profile boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS room_photo_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url text NOT NULL UNIQUE,
    public_id text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_room_photo_assets_owner ON room_photo_assets(owner_user_id);
