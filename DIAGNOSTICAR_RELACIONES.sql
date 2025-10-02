-- ===================================================
-- DIAGNÓSTICO Y ARREGLO DE RELACIONES ROTAS
-- ===================================================

-- 1. Verificar estructura de tablas principales
SELECT 'PROGRAMAS' as tabla, COUNT(*) as cantidad FROM programs;
SELECT 'CURSOS' as tabla, COUNT(*) as cantidad FROM courses;
SELECT 'LECCIONES' as tabla, COUNT(*) as cantidad FROM lessons;
SELECT 'MATERIALES' as tabla, COUNT(*) as cantidad FROM lesson_materials;

-- 2. Verificar relaciones programa-curso
SELECT 
  'PROGRAM_COURSES' as relacion,
  COUNT(*) as total,
  COUNT(pc.program_id) as con_programa,
  COUNT(pc.course_id) as con_curso
FROM program_courses pc;

-- 3. Verificar relaciones curso-lección
SELECT 
  'LESSON-COURSE' as relacion,
  COUNT(*) as total_lecciones,
  COUNT(l.course_id) as con_curso,
  COUNT(CASE WHEN l.course_id IS NULL THEN 1 END) as sin_curso
FROM lessons l;

-- 4. Verificar materiales por lección
SELECT 
  'MATERIALES POR LECCION' as relacion,
  COUNT(*) as total_materiales,
  COUNT(lm.lesson_id) as con_leccion,
  COUNT(CASE WHEN lm.lesson_id IS NULL THEN 1 END) as sin_leccion
FROM lesson_materials lm;

-- 5. Mostrar lecciones sin curso
SELECT 
  'LECCIONES SIN CURSO' as problema,
  l.id,
  l.title,
  l.course_id,
  l.created_at
FROM lessons l 
WHERE l.course_id IS NULL
ORDER BY l.created_at DESC;

-- 6. Mostrar cursos sin programa
SELECT 
  'CURSOS SIN PROGRAMA' as problema,
  c.id,
  c.title,
  c.created_at
FROM courses c 
WHERE NOT EXISTS (
  SELECT 1 FROM program_courses pc WHERE pc.course_id = c.id
)
ORDER BY c.created_at DESC;

-- 7. Mostrar materiales sin lección
SELECT 
  'MATERIALES SIN LECCION' as problema,
  lm.id,
  lm.title,
  lm.lesson_id,
  lm.created_at
FROM lesson_materials lm 
WHERE lm.lesson_id IS NULL
ORDER BY lm.created_at DESC;
