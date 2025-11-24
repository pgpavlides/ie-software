-- Simple fix for map_boxes permissions

-- Grant execution permission on existing functions
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION is_architect_or_project_manager() TO authenticated;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create is_admin function if it doesn't exist
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

-- Grant execution permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Update existing policy to include Admin role
DROP POLICY IF EXISTS "Allow Architects and Project Managers full access to map_boxes" ON map_boxes;

CREATE POLICY "map_boxes_full_access" 
ON map_boxes 
FOR ALL 
TO authenticated 
USING (is_architect_or_project_manager() OR is_admin())
WITH CHECK (is_architect_or_project_manager() OR is_admin());

-- Temporary: Allow all authenticated users to insert for debugging
CREATE POLICY IF NOT EXISTS "temp_map_boxes_insert_debug"
ON map_boxes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to automatically set created_by
CREATE OR REPLACE FUNCTION handle_map_box_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  NEW.updated_by = auth.uid();
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic field setting
DROP TRIGGER IF EXISTS on_map_box_insert ON map_boxes;
CREATE TRIGGER on_map_box_insert
  BEFORE INSERT ON map_boxes
  FOR EACH ROW
  EXECUTE FUNCTION handle_map_box_insert();

-- Update trigger
CREATE OR REPLACE FUNCTION handle_map_box_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_map_box_update ON map_boxes;
CREATE TRIGGER on_map_box_update
  BEFORE UPDATE ON map_boxes
  FOR EACH ROW
  EXECUTE FUNCTION handle_map_box_update();