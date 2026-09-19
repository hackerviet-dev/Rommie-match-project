-- Soft delete for the curated local services directory.
-- Fresh volumes already get this column from 001_schema.sql.
ALTER TABLE local_services ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
