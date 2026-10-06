ALTER TABLE rooms ADD COLUMN IF NOT EXISTS pair_occupancy_confirmed_at timestamptz;
-- Existing listings are not rewritten or falsely marked as having given consent.
-- Every new/updated row must comply; legacy listings require review before editing.
ALTER TABLE rooms ADD CONSTRAINT rooms_pair_occupancy_policy
 CHECK (max_occupants = 2 AND roommates_needed IS NOT NULL AND roommates_needed = 1
        AND pair_occupancy_confirmed_at IS NOT NULL) NOT VALID;
