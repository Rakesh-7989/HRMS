-- Task Comments Migration
-- Enables commenting on tasks with @mention support

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_tenant ON task_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON task_comments(created_at DESC);

-- Add comment on table
COMMENT ON TABLE task_comments IS 'Stores comments on tasks with @mention support';
COMMENT ON COLUMN task_comments.mentions IS 'Array of user IDs mentioned in the comment';
