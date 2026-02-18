-- ===================================================================
-- HRMS SAAS – SEED INITIAL ROLES
-- ===================================================================

INSERT INTO roles (name, description)
VALUES
    ('SUPER_ADMIN', 'Global platform controller'),
    ('ADMIN', 'Tenant-level administrator'),
    ('SUPER_ADMIN', 'Global platform controller'),
    ('ADMIN', 'Tenant-level administrator'),
    ('EMPLOYEE', 'Regular employee')
ON CONFLICT (name) DO NOTHING;
