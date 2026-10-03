ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_data jsonb;
-- Earlier clients never persisted all four steps. Require a validated submission.
UPDATE profiles SET onboarding_completed_at = NULL WHERE onboarding_data IS NULL;
