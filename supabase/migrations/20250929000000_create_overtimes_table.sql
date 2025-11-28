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

-- Create a function to calculate total overtime hours for a user in a given period
CREATE OR REPLACE FUNCTION get_user_overtime_total(
  target_user_id UUID,
  start_date DATE,
  end_date DATE
) RETURNS DECIMAL(6,2) AS $$
DECLARE
  total_hours DECIMAL(6,2);
BEGIN
  SELECT COALESCE(SUM(hours_worked), 0)
  INTO total_hours
  FROM overtimes
  WHERE user_id = target_user_id
    AND date BETWEEN start_date AND end_date;
  
  RETURN total_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get overtime statistics
CREATE OR REPLACE FUNCTION get_overtime_stats(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
) RETURNS TABLE (
  total_entries BIGINT,
  total_hours DECIMAL(8,2),
  approved_hours DECIMAL(8,2),
  pending_hours DECIMAL(8,2),
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_entries,
    COALESCE(SUM(o.hours_worked), 0) as total_hours,
    COALESCE(SUM(CASE WHEN o.is_approved THEN o.hours_worked ELSE 0 END), 0) as approved_hours,
    COALESCE(SUM(CASE WHEN NOT o.is_approved THEN o.hours_worked ELSE 0 END), 0) as pending_hours,
    COUNT(DISTINCT o.user_id) as unique_users
  FROM overtimes o
  WHERE (start_date IS NULL OR o.date >= start_date)
    AND (end_date IS NULL OR o.date <= end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;