-- Upgrade path for databases created before local password auth existed.
-- Fresh volumes already get this column from 001_schema.sql.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
