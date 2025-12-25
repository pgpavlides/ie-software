-- Fix user management issues: RLS infinite recursion and admin access

-- First, add the Architect role if it doesn't exist
INSERT INTO roles (name, description) VALUES 
    ('Architect', 'Access to architectural planning and mapping tools')
ON CONFLICT (name) DO NOTHING;

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Only admins can modify roles" ON roles;
DROP POLICY IF EXISTS "Only admins can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read their own roles" ON user_roles;

-- Create new policies using the existing is_admin() function to prevent recursion
CREATE POLICY "Only admins can modify roles" 
ON roles 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins can assign roles" 
ON user_roles 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can read their own roles" 
ON user_roles 
FOR SELECT 
USING (
    auth.uid() = user_id OR is_admin()
);

-- Update the get_user_roles function to use security definer
CREATE OR REPLACE FUNCTION get_user_roles(user_id UUID)
RETURNS TABLE (role_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the user_has_role function to use security definer
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND r.name = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all users with their roles (for admin use)
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ,
    role_names TEXT[]
) AS $$
BEGIN
    -- Only allow admins to call this function
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        (au.raw_user_meta_data->>'full_name')::TEXT,
        au.created_at,
        COALESCE(
            ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
            ARRAY[]::TEXT[]
        )
    FROM auth.users au
    LEFT JOIN user_roles ur ON au.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    GROUP BY au.id, au.email, au.raw_user_meta_data, au.created_at
    ORDER BY au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;