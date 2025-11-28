-- Create overtimes table
CREATE TABLE IF NOT EXISTS overtimes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  description TEXT,
  reason TEXT,
  project TEXT,
  hours_worked DECIMAL(4,2) GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
  ) STORED,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_overtimes_user_id ON overtimes(user_id);
CREATE INDEX IF NOT EXISTS idx_overtimes_date ON overtimes(date DESC);
CREATE INDEX IF NOT EXISTS idx_overtimes_approved ON overtimes(is_approved);
CREATE INDEX IF NOT EXISTS idx_overtimes_created_at ON overtimes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE overtimes ENABLE ROW LEVEL SECURITY;

-- Create policies for overtimes table - Only admins can access
CREATE POLICY "Allow admins full access to overtimes"
ON overtimes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'Admin'
  )
);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_overtimes_updated_at
BEFORE UPDATE ON overtimes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();