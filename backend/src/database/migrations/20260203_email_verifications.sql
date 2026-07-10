-- Email verification OTP table for tenant registration
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup by email
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- Clean up old verification codes (can be run periodically)
-- DELETE FROM email_verifications WHERE expires_at < NOW();
