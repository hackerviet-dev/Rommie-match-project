-- Soft delete for room listings. is_active means "temporarily unlisted" and must stay
-- visible to the owner, so deletion needs its own marker.
-- Fresh volumes already get this column from 001_schema.sql.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
