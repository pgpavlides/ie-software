-- Add end_date column to handle shifts spanning multiple days
ALTER TABLE overtimes ADD COLUMN end_date DATE;

-- Update existing records to have end_date same as date (for backwards compatibility)
UPDATE overtimes SET end_date = date WHERE end_date IS NULL;

-- Make end_date NOT NULL after populating existing records
ALTER TABLE overtimes ALTER COLUMN end_date SET NOT NULL;

-- Drop the old hours_worked column if it exists
ALTER TABLE overtimes DROP COLUMN IF EXISTS hours_worked;

-- Add the corrected hours_worked calculation that handles multi-day shifts
ALTER TABLE overtimes ADD COLUMN hours_worked DECIMAL(4,2) GENERATED ALWAYS AS (
  EXTRACT(EPOCH FROM (
    (end_date + end_time) - (date + start_time)
  )) / 3600
) STORED;

-- Update the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add index for end_date
CREATE INDEX IF NOT EXISTS idx_overtimes_end_date ON overtimes(end_date DESC);