ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_data jsonb;
-- Earlier clients never persisted all four steps. Require a validated submission.
UPDATE profiles SET onboarding_completed_at = NULL WHERE onboarding_data IS NULL;

-- Both branches previously used version 012. A database that applied onboarding
-- as 012 will skip 012_housing_needs; replay its idempotent changes here so either
-- branch's existing database converges to the same schema.
ALTER TABLE lifestyle_preferences ALTER COLUMN sleep_schedule DROP NOT NULL;
ALTER TABLE lifestyle_preferences ALTER COLUMN cleanliness DROP NOT NULL;
ALTER TABLE lifestyle_preferences ALTER COLUMN social_style DROP NOT NULL;
ALTER TABLE lifestyle_preferences ALTER COLUMN smoking DROP NOT NULL;
ALTER TABLE lifestyle_preferences ALTER COLUMN smoking DROP DEFAULT;
ALTER TABLE lifestyle_preferences ALTER COLUMN pet_friendly DROP NOT NULL;
ALTER TABLE lifestyle_preferences ALTER COLUMN pet_friendly DROP DEFAULT;
ALTER TABLE lifestyle_preferences ALTER COLUMN drinking DROP NOT NULL;
ALTER TABLE lifestyle_preferences ALTER COLUMN drinking DROP DEFAULT;
ALTER TABLE lifestyle_preferences ALTER COLUMN budget_min DROP NOT NULL;
ALTER TABLE lifestyle_preferences ALTER COLUMN budget_max DROP NOT NULL;
