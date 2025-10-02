-- ===================================================
-- VERIFICAR MATERIALES SIMPLE
-- ===================================================

-- 1. Ver cuántos materiales hay en total
SELECT 'TOTAL MATERIALES' as info, COUNT(*) as cantidad FROM lesson_materials;

-- 2. Ver algunos materiales de ejemplo
SELECT 
  'MATERIALES DE EJEMPLO' as info,
  id,
  title,
  material_type,
  lesson_id,
  created_at
FROM lesson_materials 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Ver lecciones con materiales
SELECT 
  'LECCIONES CON MATERIALES' as info,
  l.id as lesson_id,
  l.title as lesson_title,
  l.course_id,
  COUNT(lm.id) as materiales_count
FROM lessons l
LEFT JOIN lesson_materials lm ON l.id = lm.lesson_id
GROUP BY l.id, l.title, l.course_id
HAVING COUNT(lm.id) > 0
ORDER BY materiales_count DESC
LIMIT 5;

-- 4. Ver cursos con lecciones
SELECT 
  'CURSOS CON LECCIONES' as info,
  c.id as course_id,
  c.title as course_title,
  COUNT(l.id) as lecciones_count
FROM courses c
LEFT JOIN lessons l ON c.id = l.course_id
GROUP BY c.id, c.title
HAVING COUNT(l.id) > 0
ORDER BY lecciones_count DESC
LIMIT 5;
