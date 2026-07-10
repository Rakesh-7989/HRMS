-- Migration: Add Call Logs and Unread Counts
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('TEXT', 'FILE', 'CALL'));

-- Add unread_count to participants for sidebar performance
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Optional: track call metadata in content JSON for 'CALL' type
-- Content format: {"type": "audio/video", "duration": 120, "status": "missed/ended"}
