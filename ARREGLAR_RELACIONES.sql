-- ===================================================
-- ARREGLAR RELACIONES ROTAS
-- ===================================================

-- 1. Crear un programa por defecto si no existe
INSERT INTO programs (id, title, description, slug, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Programa General',
  'Programa por defecto para cursos sin programa',
  'programa-general',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM programs WHERE id = '00000000-0000-0000-0000-000000000001'::uuid);

-- 2. Asociar cursos sin programa al programa general
INSERT INTO program_courses (program_id, course_id, created_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid as program_id,
  c.id as course_id,
  NOW() as created_at
FROM courses c 
WHERE NOT EXISTS (
  SELECT 1 FROM program_courses pc WHERE pc.course_id = c.id
);

-- 3. Asociar lecciones sin curso al primer curso disponible
-- Primero, obtener el primer curso
WITH first_course AS (
  SELECT id FROM courses ORDER BY created_at ASC LIMIT 1
)
UPDATE lessons 
SET course_id = (SELECT id FROM first_course)
WHERE course_id IS NULL
AND EXISTS (SELECT 1 FROM first_course);

-- 4. Verificar que todas las lecciones tengan curso
-- Si no hay cursos, crear uno por defecto
INSERT INTO courses (id, title, description, slug, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Curso General',
  'Curso por defecto para lecciones sin curso',
  'curso-general',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses);

-- Asociar lecciones sin curso al curso general
UPDATE lessons 
SET course_id = '00000000-0000-0000-0000-000000000002'::uuid
WHERE course_id IS NULL;

-- 5. Verificar que todos los materiales tengan lección
-- Asociar materiales sin lección a la primera lección disponible
WITH first_lesson AS (
  SELECT id FROM lessons ORDER BY created_at ASC LIMIT 1
)
UPDATE lesson_materials 
SET lesson_id = (SELECT id FROM first_lesson)
WHERE lesson_id IS NULL
AND EXISTS (SELECT 1 FROM first_lesson);

-- 6. Verificar relaciones finales
SELECT 'VERIFICACION FINAL' as paso;

SELECT 
  'PROGRAMAS' as tabla, 
  COUNT(*) as cantidad 
FROM programs;

SELECT 
  'CURSOS' as tabla, 
  COUNT(*) as cantidad 
FROM courses;

SELECT 
  'LECCIONES' as tabla, 
  COUNT(*) as total,
  COUNT(course_id) as con_curso,
  COUNT(CASE WHEN course_id IS NULL THEN 1 END) as sin_curso
FROM lessons;

SELECT 
  'MATERIALES' as tabla, 
  COUNT(*) as total,
  COUNT(lesson_id) as con_leccion,
  COUNT(CASE WHEN lesson_id IS NULL THEN 1 END) as sin_leccion
FROM lesson_materials;

SELECT 
  'PROGRAM_COURSES' as relacion,
  COUNT(*) as asociaciones
FROM program_courses;
