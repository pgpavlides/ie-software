-- Create message_of_the_day table
CREATE TABLE IF NOT EXISTS public.message_of_the_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id),
  updated_by_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_of_the_day ENABLE ROW LEVEL SECURITY;

-- Everyone can read the message
CREATE POLICY "Anyone can read message of the day"
  ON public.message_of_the_day
  FOR SELECT
  TO authenticated
  USING (true);

-- Only Super Admin and Boss can update
CREATE POLICY "Super Admin and Boss can update message"
  ON public.message_of_the_day
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Super Admin', 'Boss')
    )
  );

-- Only Super Admin and Boss can insert
CREATE POLICY "Super Admin and Boss can insert message"
  ON public.message_of_the_day
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Super Admin', 'Boss')
    )
  );

-- Insert default message
INSERT INTO public.message_of_the_day (message, updated_by_name)
VALUES ('Welcome to IE Software! Have a productive day.', 'System');
