-- Add target scope to events (campus/program/course) and optional references
DO $$ BEGIN
  CREATE TYPE public.event_scope AS ENUM ('campus','program','course');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS target_scope public.event_scope NOT NULL DEFAULT 'campus',
  ADD COLUMN IF NOT EXISTS program_id uuid NULL REFERENCES public.programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_id uuid NULL REFERENCES public.courses(id) ON DELETE SET NULL;

-- Backfill existing rows
UPDATE public.events SET target_scope = 'campus' WHERE target_scope IS NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_events_target_scope ON public.events(target_scope);
CREATE INDEX IF NOT EXISTS idx_events_program_id ON public.events(program_id);
CREATE INDEX IF NOT EXISTS idx_events_course_id ON public.events(course_id);


