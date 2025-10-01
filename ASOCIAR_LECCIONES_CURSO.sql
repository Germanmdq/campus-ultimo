-- Asociar lecciones al curso "Curso de Prueba - Test 29092025"
UPDATE public.lessons 
SET course_id = '48ebd379-c0a3-4ce2-95c1-a65e23ec7a94'
WHERE course_id IS NULL 
AND title IN ('11', '10', '9', '8', 'prueba 7', 'prueba 6', 'prueba 5', 'prueba 4', 'ultima prueba', 'prueba 3');

-- Verificar que se asociaron correctamente
SELECT 
  l.id as lesson_id,
  l.title as lesson_title,
  l.course_id,
  c.title as course_title
FROM public.lessons l
LEFT JOIN public.courses c ON c.id = l.course_id
WHERE l.course_id = '48ebd379-c0a3-4ce2-95c1-a65e23ec7a94'
ORDER BY l.created_at DESC;
