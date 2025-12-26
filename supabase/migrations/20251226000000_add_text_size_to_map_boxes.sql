-- Add text_size column to map_boxes table
ALTER TABLE map_boxes
ADD COLUMN IF NOT EXISTS text_size SMALLINT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN map_boxes.text_size IS 'Custom text size in pixels. NULL means auto-calculated based on box size.';
