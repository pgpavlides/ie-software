-- Fix infinite recursion in RLS policies by creating a helper function

-- Create a security definer function to check if user is admin
-- This bypasses RLS and prevents infinite recursion
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

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Allow admins full access to scripts" ON scripts;
DROP POLICY IF EXISTS "Allow admins full access to script_versions" ON script_versions;
DROP POLICY IF EXISTS "Allow admins full access to script_executions" ON script_executions;
DROP POLICY IF EXISTS "Allow admins to upload scripts" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to read scripts" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete scripts" ON storage.objects;

-- Recreate policies using the helper function
CREATE POLICY "Allow admins full access to scripts"
ON scripts
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Allow admins full access to script_versions"
ON script_versions
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Allow admins full access to script_executions"
ON script_executions
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Allow admins to upload scripts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scripts' AND is_admin()
);

CREATE POLICY "Allow admins to read scripts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'scripts' AND is_admin()
);

CREATE POLICY "Allow admins to update scripts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'scripts' AND is_admin()
)
WITH CHECK (
  bucket_id = 'scripts' AND is_admin()
);

CREATE POLICY "Allow admins to delete scripts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'scripts' AND is_admin()
);
