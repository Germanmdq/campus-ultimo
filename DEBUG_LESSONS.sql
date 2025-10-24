-- ========================================
-- SCRIPT DE DEBUGGING: Lecciones en Múltiples Cursos
-- ========================================
-- Ejecutá este script en Supabase SQL Editor para ver qué está pasando

-- 1. Ver TODAS las lecciones
SELECT id, title, course_id, created_at
FROM lessons
ORDER BY created_at DESC
LIMIT 10;

-- 2. Ver TODAS las relaciones en lesson_courses
SELECT
  lc.id,
  lc.lesson_id,
  lc.course_id,
  l.title as lesson_title,
  c.title as course_title
FROM lesson_courses lc
LEFT JOIN lessons l ON l.id = lc.lesson_id
LEFT JOIN courses c ON c.id = lc.course_id
ORDER BY lc.created_at DESC;

-- 3. Ver si hay lecciones en múltiples cursos
SELECT
  l.title as lesson_title,
  COUNT(lc.course_id) as num_courses,
  STRING_AGG(c.title, ', ') as courses
FROM lessons l
JOIN lesson_courses lc ON lc.lesson_id = l.id
JOIN courses c ON c.id = lc.course_id
GROUP BY l.id, l.title
HAVING COUNT(lc.course_id) > 1;

-- 4. Ver lecciones de un curso específico (reemplazá el slug)
-- Cambiá 'TU-CURSO-SLUG' por el slug real del curso
SELECT
  c.title as course_title,
  c.slug as course_slug,
  l.id as lesson_id,
  l.title as lesson_title,
  lc.created_at
FROM courses c
LEFT JOIN lesson_courses lc ON lc.course_id = c.id
LEFT JOIN lessons l ON l.id = lc.lesson_id
WHERE c.slug = 'TU-CURSO-SLUG'
ORDER BY l.sort_order;

-- 5. VERIFICAR RLS - Ver si las policies están activas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lesson_courses';
