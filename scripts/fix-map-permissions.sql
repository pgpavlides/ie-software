-- Run this in Supabase SQL editor to fix map_boxes permissions

-- Grant execution permission on existing function
GRANT EXECUTE ON FUNCTION is_architect_or_project_manager() TO authenticated;

-- Create is_admin function
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

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Temporarily allow all authenticated users to insert (for debugging)
CREATE POLICY IF NOT EXISTS "temp_allow_all_inserts" ON map_boxes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger to auto-set created_by
CREATE OR REPLACE FUNCTION set_map_box_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.created_at = CURRENT_TIMESTAMP;
  END IF;
  NEW.updated_by = auth.uid();
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_map_box_fields_trigger ON map_boxes;
CREATE TRIGGER set_map_box_fields_trigger
  BEFORE INSERT OR UPDATE ON map_boxes
  FOR EACH ROW
  EXECUTE FUNCTION set_map_box_fields();