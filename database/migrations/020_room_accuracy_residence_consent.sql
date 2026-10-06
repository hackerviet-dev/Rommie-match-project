ALTER TABLE rooms ADD COLUMN IF NOT EXISTS accuracy_residence_confirmed_at timestamptz;
-- Keep historical rows unchanged; new writes require explicit confirmation via the API.
ALTER TABLE rooms ADD CONSTRAINT rooms_accuracy_residence_consent
 CHECK (accuracy_residence_confirmed_at IS NOT NULL) NOT VALID;
