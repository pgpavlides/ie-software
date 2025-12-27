-- Create useful_links table
CREATE TABLE IF NOT EXISTS useful_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  icon VARCHAR(100),
  color VARCHAR(50) DEFAULT '#3b82f6',
  category_id UUID,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  open_in_new_tab BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create link_categories table for organizing links
CREATE TABLE IF NOT EXISTS link_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  color VARCHAR(50) DEFAULT '#6b7280',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE useful_links
  ADD CONSTRAINT fk_useful_links_category
  FOREIGN KEY (category_id) REFERENCES link_categories(id) ON DELETE SET NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_useful_links_category ON useful_links(category_id);
CREATE INDEX IF NOT EXISTS idx_useful_links_display_order ON useful_links(display_order);
CREATE INDEX IF NOT EXISTS idx_useful_links_is_active ON useful_links(is_active);
CREATE INDEX IF NOT EXISTS idx_link_categories_display_order ON link_categories(display_order);

-- Enable RLS
ALTER TABLE useful_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for useful_links
CREATE POLICY "useful_links_select" ON useful_links
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "useful_links_insert" ON useful_links
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "useful_links_update" ON useful_links
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "useful_links_delete" ON useful_links
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for link_categories
CREATE POLICY "link_categories_select" ON link_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "link_categories_insert" ON link_categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "link_categories_update" ON link_categories
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "link_categories_delete" ON link_categories
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Insert default categories
INSERT INTO link_categories (name, description, icon, color, display_order) VALUES
  ('Documentation', 'Technical documentation and guides', 'book', '#3b82f6', 1),
  ('Tools', 'Development and productivity tools', 'tool', '#10b981', 2),
  ('Resources', 'Useful resources and references', 'bookmark', '#f59e0b', 3),
  ('Internal', 'Internal company links', 'home', '#8b5cf6', 4);

-- Add useful-links to role_section_permissions for existing roles
INSERT INTO role_section_permissions (role_id, section_key, can_access)
SELECT r.id, 'useful-links', true
FROM roles r
WHERE r.name IN ('Super Admin', 'Boss', 'Software', 'Head of Software')
ON CONFLICT (role_id, section_key) DO NOTHING;
