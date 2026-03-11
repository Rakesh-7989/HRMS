-- Granular Chat Permissions Migration

-- 1. Add new permissions
INSERT INTO permissions (module, action, label, description)
VALUES 
    ('chat', 'send', 'Send Messages', 'Send text, files, and images in conversations'),
    ('chat', 'voice_call', 'Voice Calls', 'Initiate or join voice calls'),
    ('chat', 'video_call', 'Video Calls', 'Initiate or join video calls'),
    ('chat', 'create_group', 'Create Groups', 'Create new group conversations'),
    ('chat', 'manage_group', 'Manage Participants', 'Add or remove members from group chats'),
    ('chat', 'edit_messages', 'Edit Messages', 'Edit previously sent messages'),
    ('chat', 'delete_messages', 'Delete Messages', 'Delete messages (own or moderate others)')
ON CONFLICT (module, action) DO NOTHING;



-- 3. Assign new permissions to roles across all existing tenants
-- We'll give most permissions to ADMIN, HR, MANAGER, and basic send/view to EMPLOYEE

DO $$
DECLARE
    t_id UUID;
    p_id UUID;
    r_name VARCHAR;
BEGIN
    FOR t_id IN SELECT id FROM tenants LOOP
        
        -- Assign all chat permissions to ADMIN and HR
        FOR p_id IN SELECT id FROM permissions WHERE module = 'chat' LOOP
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t_id, 'ADMIN', p_id, true),
                   (t_id, 'HR', p_id, true)
            ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = true;
        END LOOP;

        -- Assign standard permissions to MANAGER (everything except manage)
        FOR p_id IN SELECT id FROM permissions WHERE module = 'chat' AND action != 'manage' LOOP
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t_id, 'MANAGER', p_id, true)
            ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = true;
        END LOOP;

        -- Assign basic permissions to EMPLOYEE (view, send, voice_call, video_call, edit_own, delete_own)
        FOR p_id IN SELECT id FROM permissions WHERE module = 'chat' AND action IN ('view', 'send', 'voice_call', 'video_call', 'edit_messages', 'delete_messages') LOOP
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t_id, 'EMPLOYEE', p_id, true)
            ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = true;
        END LOOP;

    END LOOP;
END $$;
