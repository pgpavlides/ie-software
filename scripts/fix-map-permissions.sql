-- Run this in Supabase SQL editor to fix map_boxes permissions

-- First, drop any existing policies that might conflict
DROP POLICY IF EXISTS "temp_allow_all_inserts" ON map_boxes;
DROP POLICY IF EXISTS "Users can view active map boxes" ON map_boxes;
DROP POLICY IF EXISTS "Admins can insert map boxes" ON map_boxes;
DROP POLICY IF EXISTS "Admins can update map boxes" ON map_boxes;

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

-- Create trigger to auto-set created_by fields
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

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS set_map_box_fields_trigger ON map_boxes;
CREATE TRIGGER set_map_box_fields_trigger
  BEFORE INSERT OR UPDATE ON map_boxes
  FOR EACH ROW
  EXECUTE FUNCTION set_map_box_fields();

-- Create new RLS policies (without IF NOT EXISTS)
CREATE POLICY "temp_allow_all_inserts" ON map_boxes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view active map boxes" ON map_boxes
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can update map boxes" ON map_boxes
  FOR UPDATE TO authenticated
  USING (is_admin() OR is_architect_or_project_manager())
  WITH CHECK (true);

CREATE POLICY "Admins can delete map boxes" ON map_boxes
  FOR DELETE TO authenticated
  USING (is_admin() OR is_architect_or_project_manager());