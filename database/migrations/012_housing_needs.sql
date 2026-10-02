-- Upgrade path for the onboarding "housing needs" written by PUT /api/users/me/housing-needs.
-- Fresh volumes already get the relaxed columns from 001_schema.sql; every statement here is
-- written to be a no-op on such a database and safe to run again.
--
-- Four of the fields have a suitable home already and are reused as-is on profiles:
--   has_room, occupation_status, organization_name, hide_organization.
-- The other three (drinking, preferred_distance, preferred_room_type) already exist on
-- lifestyle_preferences and are reused there instead of being duplicated into a new table.
--
-- lifestyle_preferences used to require sleep_schedule/cleanliness/social_style/budget_min/
-- budget_max and defaulted the boolean habits (smoking, pet_friendly, drinking) to false.
-- That made a row mean "the whole lifestyle questionnaire was submitted", so a member could
-- not record drinking / search distance / wanted room type without fabricating the rest of
-- the questionnaire, and a stored false was indistinguishable from "chưa khai" (not answered).
--
-- The preference columns become optional: NULL now means "chưa khai", and a row counts as a
-- real lifestyle submission only when sleep_schedule IS NOT NULL. Matching and GET
-- /me/lifestyle ignore rows that carry only housing-need fields (see UserService and
-- MatchingService), so this change does not alter scoring or the lifestyle contract.

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
