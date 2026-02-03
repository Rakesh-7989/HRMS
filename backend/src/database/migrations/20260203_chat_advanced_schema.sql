-- Add parent_id to messages for threading
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES messages(id) ON DELETE CASCADE;

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Add status column to users for persistence (ONLINE, AWAY, DND, OFFLINE)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'OFFLINE';

-- Add group_admin boolean to conversation_participants to allow managing groups
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
