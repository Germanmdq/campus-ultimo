-- Add useful indexes to speed up common queries
-- Events filtering and ordering
create index if not exists idx_events_start_at on public.events (start_at);
create index if not exists idx_events_target_scope on public.events (target_scope);
create index if not exists idx_events_program_id on public.events (program_id);
create index if not exists idx_events_course_id on public.events (course_id);

-- Enrollments lookups
create index if not exists idx_enrollments_user_id on public.enrollments (user_id);
create index if not exists idx_enrollments_status on public.enrollments (status);
create index if not exists idx_course_enrollments_user_id on public.course_enrollments (user_id);
create index if not exists idx_course_enrollments_status on public.course_enrollments (status);

-- Program courses and lessons
create index if not exists idx_program_courses_program_id on public.program_courses (program_id);
create index if not exists idx_program_courses_course_id on public.program_courses (course_id);
create index if not exists idx_lessons_course_id on public.lessons (course_id);

-- Lesson progress queries
create index if not exists idx_lesson_progress_user_id on public.lesson_progress (user_id);
create index if not exists idx_lesson_progress_lesson_id on public.lesson_progress (lesson_id);
create index if not exists idx_lesson_progress_completed on public.lesson_progress (completed);
create index if not exists idx_lesson_progress_updated_at on public.lesson_progress (updated_at);
