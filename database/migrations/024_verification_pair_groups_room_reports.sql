-- Room reports: a report can name the listing it is about. The reported member stays the
-- room owner, so the moderation queue and per-member counts keep working unchanged.
ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_user_reports_room ON user_reports(room_id) WHERE room_id IS NOT NULL;

-- Housing groups follow the pair room policy (019): at most two people, counting pending
-- invitations. The group row is locked so two concurrent invites cannot both pass the count.
-- Only inserts are checked; legacy groups that already have more members are left as they are.
CREATE OR REPLACE FUNCTION housing_group_members_pair_limit()
RETURNS trigger AS $$
BEGIN
    PERFORM 1 FROM housing_groups WHERE id = NEW.group_id FOR UPDATE;
    IF (SELECT count(*) FROM housing_group_members WHERE group_id = NEW.group_id) >= 2 THEN
        RAISE EXCEPTION 'housing group % already has two members', NEW.group_id
            USING ERRCODE = 'check_violation', CONSTRAINT = 'housing_group_pair_limit';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS housing_group_members_pair_limit ON housing_group_members;
CREATE TRIGGER housing_group_members_pair_limit BEFORE INSERT ON housing_group_members
FOR EACH ROW EXECUTE FUNCTION housing_group_members_pair_limit();
