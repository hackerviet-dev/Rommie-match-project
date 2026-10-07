-- Image messages in chat. The image itself lives on Cloudinary (uploaded through
-- POST /api/media/images); the row keeps its URL. A message now needs text, an image, or both,
-- so content may be an empty string when an image is attached. Every statement is safe to run
-- again.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_image_url_check;
ALTER TABLE messages ADD CONSTRAINT messages_image_url_check
    CHECK (image_url IS NULL OR length(image_url) BETWEEN 1 AND 500);

-- Replaces the inline CHECK from 001_schema.sql (length(btrim(content)) BETWEEN 1 AND 4000).
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE messages ADD CONSTRAINT messages_content_check
    CHECK (length(btrim(content)) <= 4000 AND (length(btrim(content)) >= 1 OR image_url IS NOT NULL));
