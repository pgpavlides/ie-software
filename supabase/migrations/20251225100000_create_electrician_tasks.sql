-- Create electrician_tasks table
CREATE TABLE IF NOT EXISTS electrician_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date DATE,
  location TEXT,
  notes TEXT,
  completion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_electrician_tasks_assigned_to ON electrician_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_electrician_tasks_assigned_by ON electrician_tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_electrician_tasks_status ON electrician_tasks(status);
CREATE INDEX IF NOT EXISTS idx_electrician_tasks_priority ON electrician_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_electrician_tasks_due_date ON electrician_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_electrician_tasks_created_at ON electrician_tasks(created_at DESC);

-- Enable Row Level Security
ALTER TABLE electrician_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Head of Electronics can do everything
CREATE POLICY "Head of Electronics full access"
ON electrician_tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('Head of Electronics', 'Super Admin', 'Admin')
  )
);

-- Policy: Electronics can view tasks assigned to them
CREATE POLICY "Electronics can view assigned tasks"
ON electrician_tasks
FOR SELECT
USING (
  assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('Head of Electronics', 'Super Admin', 'Admin')
  )
);

-- Policy: Electronics can update their assigned tasks (status and completion_notes only)
CREATE POLICY "Electronics can update assigned tasks"
ON electrician_tasks
FOR UPDATE
USING (
  assigned_to = auth.uid()
)
WITH CHECK (
  assigned_to = auth.uid()
);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_electrician_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  -- Auto-set completed_at when status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  END IF;
  -- Clear completed_at if status changes from completed
  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_electrician_tasks_updated_at
BEFORE UPDATE ON electrician_tasks
FOR EACH ROW
EXECUTE FUNCTION update_electrician_tasks_updated_at();

-- Function to get electrician users (for task assignment dropdown)
CREATE OR REPLACE FUNCTION get_electrician_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
    r.name as role_name
  FROM auth.users u
  JOIN user_roles ur ON u.id = ur.user_id
  JOIN roles r ON ur.role_id = r.id
  WHERE r.name IN ('Electronics', 'Head of Electronics')
  ORDER BY r.name DESC, full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
