-- Add overtime-manager section permissions for manager roles
-- This allows Super Admin, Admin, and Boss to access the Overtime Manager

INSERT INTO role_section_permissions (role_id, section_key, can_access, can_edit)
SELECT r.id, 'overtime-manager', true, true
FROM roles r
WHERE r.name IN ('Super Admin', 'Admin', 'Boss')
ON CONFLICT (role_id, section_key) DO UPDATE SET can_access = true, can_edit = true;
