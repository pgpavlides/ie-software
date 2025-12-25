-- Quick fix for UPDATE policy to allow soft deletes
-- Run this in Supabase SQL editor

DROP POLICY IF EXISTS "Admins can update map boxes" ON map_boxes;

-- Temporarily allow all authenticated users to update (for debugging)
CREATE POLICY "temp_allow_all_updates" ON map_boxes
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (true);