-- Add optional form URL for lessons that require admin approval
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS approval_form_url text;


