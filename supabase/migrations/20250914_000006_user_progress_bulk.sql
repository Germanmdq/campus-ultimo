-- Compute per-course progress for a user in bulk (server-side aggregation)
create or replace function public.get_user_course_progress_bulk(
  _user_id uuid,
  _course_ids uuid[]
)
returns table(course_id uuid, progress_percent integer)
language sql
stable
as $$
  with lessons_per_course as (
    select course_id, count(*)::int as total
    from public.lessons
    where course_id = any(_course_ids)
    group by course_id
  ),
  completed as (
    select l.course_id, count(*)::int as completed
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = _user_id
      and lp.completed = true
      and l.course_id = any(_course_ids)
    group by l.course_id
  )
  select
    lpc.course_id,
    coalesce(
      case when lpc.total > 0 then round((coalesce(c.completed, 0)::decimal / lpc.total::decimal) * 100)::int else 0 end,
      0
    ) as progress_percent
  from lessons_per_course lpc
  left join completed c on c.course_id = lpc.course_id;
$$;


