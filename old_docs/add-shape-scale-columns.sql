-- Add shape and scale columns to map_boxes table
-- Run this in Supabase SQL editor

ALTER TABLE map_boxes 
ADD COLUMN IF NOT EXISTS shape TEXT DEFAULT 'circle',
ADD COLUMN IF NOT EXISTS scale DECIMAL(3,1) DEFAULT 1.0;

-- Add check constraint for valid shapes
ALTER TABLE map_boxes 
ADD CONSTRAINT check_valid_shape 
CHECK (shape IN ('circle', 'square', 'triangle', 'diamond'));

-- Add check constraint for valid scale range
ALTER TABLE map_boxes 
ADD CONSTRAINT check_valid_scale 
CHECK (scale >= 0.5 AND scale <= 3.0);