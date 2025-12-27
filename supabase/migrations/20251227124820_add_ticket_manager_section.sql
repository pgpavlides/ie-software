-- Add ticket-manager section to role_section_permissions
-- This section is for managing all tickets across the system
-- Only Super Admin, Boss, and Efficiency Coordinator have access by default

-- Insert ticket-manager section permissions for default manager roles
INSERT INTO role_section_permissions (role_id, section_key, can_access, can_edit)
SELECT r.id, 'ticket-manager', true, true
FROM roles r
WHERE r.name IN ('Super Admin', 'Boss', 'Efficiency Coordinator')
ON CONFLICT (role_id, section_key) DO UPDATE SET
  can_access = true,
  can_edit = true;
