-- Migration to fix 403 Forbidden errors on Manager Dashboard
-- Grants missing attendance permissions to the MANAGER role

DO $$
DECLARE
    t RECORD;
    p_analytics_id UUID;
    p_view_all_id UUID;
    p_view_team_id UUID;
BEGIN
    -- Get permission IDs
    SELECT id INTO p_analytics_id FROM permissions WHERE module = 'attendance' AND action = 'view_analytics';
    SELECT id INTO p_view_team_id FROM permissions WHERE module = 'attendance' AND action = 'view_team';

    -- Loop through all existing tenants
    FOR t IN SELECT id FROM tenants LOOP
        -- Grant view_analytics to MANAGER
        IF p_analytics_id IS NOT NULL THEN
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'MANAGER', p_analytics_id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) 
            DO UPDATE SET enabled = TRUE;
        END IF;

        -- Grant view_all to MANAGER (Managers need this for high-level summaries)
        IF p_view_all_id IS NOT NULL THEN
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'MANAGER', p_view_all_id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) 
            DO UPDATE SET enabled = TRUE;
        END IF;

        -- Ensure view_team is enabled for MANAGER
        IF p_view_team_id IS NOT NULL THEN
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'MANAGER', p_view_team_id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) 
            DO UPDATE SET enabled = TRUE;
        END IF;
    END LOOP;
END $$;
