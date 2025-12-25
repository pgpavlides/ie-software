-- Add Architect role (Project Manager already exists)
INSERT INTO roles (name, description)
VALUES ('Architect', 'Architectural oversight and design access')
ON CONFLICT (name) DO NOTHING;

-- Create map_boxes table for storing clickable boxes on the company map
CREATE TABLE IF NOT EXISTS map_boxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  link_url TEXT NOT NULL,
  x_position FLOAT NOT NULL, -- X coordinate relative to map image (0-1 range)
  y_position FLOAT NOT NULL, -- Y coordinate relative to map image (0-1 range)
  width FLOAT DEFAULT 0.05, -- Box width as percentage of map width
  height FLOAT DEFAULT 0.05, -- Box height as percentage of map height
  color TEXT DEFAULT '#3B82F6', -- Box color (hex code)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_map_boxes_active ON map_boxes(is_active);
CREATE INDEX IF NOT EXISTS idx_map_boxes_position ON map_boxes(x_position, y_position);
CREATE INDEX IF NOT EXISTS idx_map_boxes_created_by ON map_boxes(created_by);

-- Enable Row Level Security
ALTER TABLE map_boxes ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is Architect or Project Manager
CREATE OR REPLACE FUNCTION is_architect_or_project_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('Architect', 'Project Manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for map_boxes table
-- Allow Architects and Project Managers full access
CREATE POLICY "Allow Architects and Project Managers full access to map_boxes"
ON map_boxes
FOR ALL
TO authenticated
USING (is_architect_or_project_manager())
WITH CHECK (is_architect_or_project_manager());

-- Allow all authenticated users to read active map boxes (for viewing the map)
CREATE POLICY "Allow all users to view active map_boxes"
ON map_boxes
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_map_boxes_updated_at
BEFORE UPDATE ON map_boxes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to set updated_by on updates
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_map_boxes_updated_by
BEFORE UPDATE ON map_boxes
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();