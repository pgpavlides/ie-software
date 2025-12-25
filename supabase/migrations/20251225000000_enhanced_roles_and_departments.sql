-- Enhanced Roles and Departments System
-- This migration adds departments and a comprehensive role hierarchy

-- ============================================
-- 1. CREATE DEPARTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'building',
    color TEXT DEFAULT '#6b7280',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS on departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Everyone can read departments
CREATE POLICY "Allow read access to departments" ON departments
    FOR SELECT USING (true);

-- Only Super Admin and Admin can modify departments
CREATE POLICY "Only admins can modify departments" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Super Admin', 'Admin')
        )
    );

-- Create trigger for updated_at on departments
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. ENHANCE ROLES TABLE
-- ============================================

-- Add new columns to roles table
ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS permission_level INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_head_role BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6b7280',
    ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for department lookup
CREATE INDEX IF NOT EXISTS idx_roles_department_id ON roles(department_id);
CREATE INDEX IF NOT EXISTS idx_roles_permission_level ON roles(permission_level);

-- ============================================
-- 3. INSERT DEPARTMENTS
-- ============================================
INSERT INTO departments (name, description, icon, color, display_order) VALUES
    ('Executive', 'Executive leadership and management', 'crown', '#f59e0b', 1),
    ('Operations', 'Operational oversight and coordination', 'settings', '#8b5cf6', 2),
    ('Software', 'Software development and IT', 'code', '#3b82f6', 3),
    ('Accounting', 'Finance and accounting', 'calculator', '#10b981', 4),
    ('Marketing', 'Marketing and communications', 'megaphone', '#ec4899', 5),
    ('Creative', 'Artists and designers', 'palette', '#f97316', 6),
    ('Construction', 'Construction and building', 'hammer', '#78716c', 7),
    ('Manufacturing', 'CNC and 3D production', 'cog', '#64748b', 8),
    ('Electronics', 'Electrical systems', 'zap', '#eab308', 9),
    ('Project Management', 'Project coordination', 'clipboard', '#06b6d4', 10),
    ('Logistics', 'Delivery and floor management', 'truck', '#84cc16', 11),
    ('Sales', 'Sales and business development', 'trending-up', '#ef4444', 12)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. UPDATE EXISTING ROLES & ADD NEW ROLES
-- ============================================

-- First, update existing Admin role to be Super Admin (highest permission)
UPDATE roles
SET
    name = 'Super Admin',
    description = 'Full system control and user management. Has access to all features and can manage all users.',
    permission_level = 100,
    icon = 'shield',
    color = '#dc2626',
    display_order = 1
WHERE name = 'Admin';

-- Insert all new roles
-- System roles (no department)
INSERT INTO roles (name, description, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Admin', 'Full visibility to see everything from all roles and departments. Can view all data but limited modification rights.', 90, 'eye', '#7c3aed', 2, false)
ON CONFLICT (name) DO NOTHING;

-- Executive roles
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Boss', 'Executive leadership with full organizational oversight.',
        (SELECT id FROM departments WHERE name = 'Executive'), 85, 'briefcase', '#f59e0b', 3, false),
    ('Efficiency Coordinator', 'Operational efficiency and process optimization.',
        (SELECT id FROM departments WHERE name = 'Operations'), 70, 'activity', '#8b5cf6', 4, false)
ON CONFLICT (name) DO NOTHING;

-- Software Department
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Software', 'Software development and technical implementation.',
        (SELECT id FROM departments WHERE name = 'Software'), 50, 'code', '#3b82f6', 10, false),
    ('Head of Software', 'Leads the software development team.',
        (SELECT id FROM departments WHERE name = 'Software'), 65, 'code', '#2563eb', 9, true)
ON CONFLICT (name) DO NOTHING;

-- Link Head of Software to Software role
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Software')
WHERE name = 'Head of Software';

-- Accounting Department
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Accounting', 'Financial management and bookkeeping.',
        (SELECT id FROM departments WHERE name = 'Accounting'), 50, 'calculator', '#10b981', 12, false),
    ('Head of Accounting', 'Leads the accounting and finance team.',
        (SELECT id FROM departments WHERE name = 'Accounting'), 65, 'calculator', '#059669', 11, true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Accounting')
WHERE name = 'Head of Accounting';

-- Marketing Department
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Marketing', 'Marketing campaigns and brand management.',
        (SELECT id FROM departments WHERE name = 'Marketing'), 50, 'megaphone', '#ec4899', 14, false),
    ('Head of Marketing', 'Leads the marketing team.',
        (SELECT id FROM departments WHERE name = 'Marketing'), 65, 'megaphone', '#db2777', 13, true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Marketing')
WHERE name = 'Head of Marketing';

-- Artists (Creative Department)
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Artist', 'Creative artwork and visual design.',
        (SELECT id FROM departments WHERE name = 'Creative'), 50, 'brush', '#f97316', 16, false),
    ('Head Artist', 'Leads the artistic team.',
        (SELECT id FROM departments WHERE name = 'Creative'), 65, 'brush', '#ea580c', 15, true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Artist')
WHERE name = 'Head Artist';

-- Designers (Creative Department)
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Designer', 'Product and experience design.',
        (SELECT id FROM departments WHERE name = 'Creative'), 50, 'palette', '#fb923c', 18, false),
    ('Head Designer', 'Leads the design team.',
        (SELECT id FROM departments WHERE name = 'Creative'), 65, 'palette', '#f97316', 17, true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Designer')
WHERE name = 'Head Designer';

-- Construction Department
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Construction', 'Physical construction and building.',
        (SELECT id FROM departments WHERE name = 'Construction'), 50, 'hammer', '#78716c', 20, false),
    ('Head of Construction', 'Leads the construction team.',
        (SELECT id FROM departments WHERE name = 'Construction'), 65, 'hammer', '#57534e', 19, true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Construction')
WHERE name = 'Head of Construction';

-- CNC (Manufacturing Department)
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('CNC', 'CNC machining and manufacturing.',
        (SELECT id FROM departments WHERE name = 'Manufacturing'), 50, 'cog', '#64748b', 21, false)
ON CONFLICT (name) DO NOTHING;

-- Update existing Electronics role
UPDATE roles
SET
    department_id = (SELECT id FROM departments WHERE name = 'Electronics'),
    permission_level = 50,
    icon = 'zap',
    color = '#eab308',
    display_order = 23
WHERE name = 'Electronics';

-- Add Head of Electronics
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Head of Electronics', 'Leads the electronics team.',
        (SELECT id FROM departments WHERE name = 'Electronics'), 65, 'zap', '#ca8a04', 22, true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Electronics')
WHERE name = 'Head of Electronics';

-- 3D and RND Production (Manufacturing Department)
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('3D and RND Production', '3D printing and research & development production.',
        (SELECT id FROM departments WHERE name = 'Manufacturing'), 50, 'box', '#64748b', 24, false)
ON CONFLICT (name) DO NOTHING;

-- Update existing Project Manager role
UPDATE roles
SET
    department_id = (SELECT id FROM departments WHERE name = 'Project Management'),
    permission_level = 55,
    icon = 'clipboard',
    color = '#06b6d4',
    display_order = 26
WHERE name = 'Project Manager';

-- Add Head Project Manager
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Head Project Manager', 'Leads the project management team.',
        (SELECT id FROM departments WHERE name = 'Project Management'), 70, 'clipboard', '#0891b2', 25, true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Project Manager')
WHERE name = 'Head Project Manager';

-- Floor Manager (Logistics Department)
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Floor Manager', 'On-site floor management and operations.',
        (SELECT id FROM departments WHERE name = 'Logistics'), 55, 'layout', '#84cc16', 27, false)
ON CONFLICT (name) DO NOTHING;

-- Delivery (Logistics Department)
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Delivery', 'Delivery and logistics coordination.',
        (SELECT id FROM departments WHERE name = 'Logistics'), 45, 'truck', '#65a30d', 28, false)
ON CONFLICT (name) DO NOTHING;

-- Sales Department
INSERT INTO roles (name, description, department_id, permission_level, icon, color, display_order, is_head_role) VALUES
    ('Sales', 'Sales and client relations.',
        (SELECT id FROM departments WHERE name = 'Sales'), 50, 'trending-up', '#ef4444', 30, false),
    ('Head of Sales', 'Leads the sales team.',
        (SELECT id FROM departments WHERE name = 'Sales'), 65, 'trending-up', '#dc2626', 29, true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Sales')
WHERE name = 'Head of Sales';

-- Deactivate old roles that are being replaced (Engineer, Architect)
UPDATE roles SET is_active = false WHERE name IN ('Engineer', 'Architect');

-- ============================================
-- 5. UPDATE RLS POLICIES
-- ============================================

-- Drop existing policies that reference old 'Admin' role
DROP POLICY IF EXISTS "Only admins can modify roles" ON roles;
DROP POLICY IF EXISTS "Only admins can assign roles" ON user_roles;

-- Create new policies with Super Admin and Admin
CREATE POLICY "Super Admin and Admin can modify roles" ON roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Super Admin', 'Admin')
        )
    );

CREATE POLICY "Super Admin and Admin can assign roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Super Admin', 'Admin')
        )
    );

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to check if user has minimum permission level
CREATE OR REPLACE FUNCTION user_has_permission_level(user_id UUID, min_level INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
        AND r.permission_level >= $2
        AND r.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's highest permission level
CREATE OR REPLACE FUNCTION get_user_permission_level(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    max_level INTEGER;
BEGIN
    SELECT COALESCE(MAX(r.permission_level), 0) INTO max_level
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1 AND r.is_active = true;

    RETURN max_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's department(s)
CREATE OR REPLACE FUNCTION get_user_departments(user_id UUID)
RETURNS TABLE (department_id UUID, department_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT d.id, d.name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN departments d ON r.department_id = d.id
    WHERE ur.user_id = $1 AND r.is_active = true AND d.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a head/lead of any department
CREATE OR REPLACE FUNCTION user_is_department_head(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
        AND r.is_head_role = true
        AND r.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. CREATE VIEW FOR EASY ROLE QUERIES
-- ============================================

CREATE OR REPLACE VIEW roles_with_departments AS
SELECT
    r.id,
    r.name,
    r.description,
    r.permission_level,
    r.is_head_role,
    r.icon,
    r.color,
    r.display_order,
    r.is_active,
    r.department_id,
    d.name as department_name,
    d.color as department_color,
    pr.name as parent_role_name
FROM roles r
LEFT JOIN departments d ON r.department_id = d.id
LEFT JOIN roles pr ON r.parent_role_id = pr.id
WHERE r.is_active = true
ORDER BY r.display_order;

-- Grant access to the view
GRANT SELECT ON roles_with_departments TO authenticated;
