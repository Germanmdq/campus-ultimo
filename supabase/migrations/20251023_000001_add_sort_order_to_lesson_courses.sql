-- Add sort_order column to lesson_courses table
ALTER TABLE public.lesson_courses
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_lesson_courses_sort
ON public.lesson_courses(course_id, sort_order);
