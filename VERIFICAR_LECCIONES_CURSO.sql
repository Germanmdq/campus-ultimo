-- 1. Verificar si las lecciones están asociadas a cursos
SELECT 
  l.id as lesson_id,
  l.title as lesson_title,
  l.course_id,
  c.title as course_title
FROM public.lessons l
LEFT JOIN public.courses c ON c.id = l.course_id
ORDER BY l.created_at DESC;

-- 2. Verificar si hay cursos disponibles
SELECT id, title, created_at
FROM public.courses
ORDER BY created_at DESC;
