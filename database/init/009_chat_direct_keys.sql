-- Chat moves into the .NET API. Conversations created before direct_key existed (the
-- seed data included) get their key now, so "start chat" with the same person finds
-- them instead of opening a duplicate. Only exact two-member conversations qualify.
-- COLLATE "C" matches the ordinal comparison the API uses to build the key.

UPDATE conversations c
SET direct_key = pair.direct_key
FROM (
    -- If one pair somehow has several conversations, only the oldest id gets the key.
    SELECT DISTINCT ON (direct_key) conversation_id, direct_key
    FROM (
        SELECT conversation_id,
               min(user_id::text COLLATE "C") || ':' || max(user_id::text COLLATE "C") AS direct_key
        FROM conversation_members
        GROUP BY conversation_id
        HAVING count(*) = 2
    ) pairs
    ORDER BY direct_key, conversation_id
) pair
WHERE c.id = pair.conversation_id
  AND c.direct_key IS NULL
  AND NOT EXISTS (SELECT 1 FROM conversations taken WHERE taken.direct_key = pair.direct_key);
