-- Add task-manager section permissions for manager roles
-- This allows Super Admin, Boss, and Efficiency Coordinator to access the Task Manager

INSERT INTO role_section_permissions (role_id, section_key, can_access, can_edit)
SELECT r.id, 'task-manager', true, true
FROM roles r
WHERE r.name IN ('Super Admin', 'Boss', 'Efficiency Coordinator')
ON CONFLICT (role_id, section_key) DO UPDATE SET can_access = true, can_edit = true;
