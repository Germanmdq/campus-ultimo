-- ===================================================
-- VERIFICAR MATERIAL ESPECÍFICO
-- ===================================================

-- Buscar el material específico que aparece en los logs
SELECT 
  'MATERIAL ESPECÍFICO' as info,
  lm.id,
  lm.title,
  lm.material_type,
  lm.lesson_id,
  l.title as lesson_title,
  l.course_id,
  c.title as course_title,
  lm.created_at
FROM lesson_materials lm
LEFT JOIN lessons l ON lm.lesson_id = l.id
LEFT JOIN courses c ON l.course_id = c.id
WHERE lm.id = '42a3f95e-5979-457f-bc91-a35851d254c9';

-- Ver todos los materiales de esa lección
SELECT 
  'TODOS LOS MATERIALES DE ESA LECCIÓN' as info,
  lm.id,
  lm.title,
  lm.material_type,
  lm.lesson_id,
  l.title as lesson_title
FROM lesson_materials lm
LEFT JOIN lessons l ON lm.lesson_id = l.id
WHERE lm.lesson_id = (
  SELECT lesson_id 
  FROM lesson_materials 
  WHERE id = '42a3f95e-5979-457f-bc91-a35851d254c9'
);

-- Ver información del curso completo
SELECT 
  'INFORMACIÓN DEL CURSO' as info,
  c.id as course_id,
  c.title as course_title,
  c.slug as course_slug,
  COUNT(l.id) as total_lecciones,
  COUNT(lm.id) as total_materiales
FROM courses c
LEFT JOIN lessons l ON c.id = l.course_id
LEFT JOIN lesson_materials lm ON l.id = lm.lesson_id
WHERE c.id = (
  SELECT l.course_id 
  FROM lesson_materials lm2
  LEFT JOIN lessons l ON lm2.lesson_id = l.id
  WHERE lm2.id = '42a3f95e-5979-457f-bc91-a35851d254c9'
)
GROUP BY c.id, c.title, c.slug;
