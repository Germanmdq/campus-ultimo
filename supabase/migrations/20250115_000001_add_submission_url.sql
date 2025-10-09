-- Add submission URL field for lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS submission_url text;
