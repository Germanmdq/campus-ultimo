-- ===================================================
-- ARREGLAR RELACIONES BÁSICAS
-- ===================================================

-- 1. Crear programa por defecto
INSERT INTO programs (id, title, description, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Programa General',
  'Programa por defecto',
  'programa-general',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Crear curso por defecto
INSERT INTO courses (id, title, description, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Curso General',
  'Curso por defecto',
  'curso-general',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Asociar cursos sin programa
INSERT INTO program_courses (program_id, course_id, created_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  c.id,
  NOW()
FROM courses c 
WHERE NOT EXISTS (
  SELECT 1 FROM program_courses pc WHERE pc.course_id = c.id
);

-- 4. Asociar lecciones sin curso
UPDATE lessons 
SET course_id = '00000000-0000-0000-0000-000000000002'::uuid
WHERE course_id IS NULL;

-- 5. Verificar estado
SELECT 'PROGRAMAS' as tabla, COUNT(*) as cantidad FROM programs;
SELECT 'CURSOS' as tabla, COUNT(*) as cantidad FROM courses;
SELECT 'LECCIONES' as tabla, COUNT(*) as cantidad FROM lessons;
SELECT 'MATERIALES' as tabla, COUNT(*) as cantidad FROM lesson_materials;
SELECT 'PROGRAM_COURSES' as relacion, COUNT(*) as cantidad FROM program_courses;
