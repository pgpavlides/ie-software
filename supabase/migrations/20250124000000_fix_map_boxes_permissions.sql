-- Fix map_boxes permissions to allow Admin role and grant function access

-- Grant execution permission on the helper function to authenticated users
GRANT EXECUTE ON FUNCTION is_architect_or_project_manager() TO authenticated;

-- Create helper function to check for Admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission on the new admin function
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Drop and recreate the policy to include Admin role
DROP POLICY IF EXISTS "Allow Architects and Project Managers full access to map_boxes" ON map_boxes;

CREATE POLICY "Allow Architects, Project Managers, and Admins full access to map_boxes"
ON map_boxes
FOR ALL
TO authenticated
USING (is_architect_or_project_manager() OR is_admin())
WITH CHECK (is_architect_or_project_manager() OR is_admin());

-- Ensure the created_by field is automatically set
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  NEW.updated_by = auth.uid();
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set created_by on insert
CREATE TRIGGER set_map_boxes_created_by
  BEFORE INSERT ON map_boxes
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- Create trigger to automatically update updated_by and updated_at on update
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_map_boxes_updated_by
  BEFORE UPDATE ON map_boxes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();