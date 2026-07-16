-- Session enhancements for security hardening
-- Add remember_me, last_used_at, fingerprint_hash columns

ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS remember_me BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT now(),
    ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT;

-- Index for session listing and cleanup
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active_expires
    ON user_sessions (user_id, is_revoked, expires_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_fingerprint
    ON user_sessions (fingerprint_hash);

-- Function to hash fingerprint (IP + UA)
CREATE OR REPLACE FUNCTION hash_fingerprint(ip TEXT, ua TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(ip || '|' || ua, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;