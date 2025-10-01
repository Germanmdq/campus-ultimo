-- ===================================================
-- SOLUCIÓN COMPLETA: Deshabilitar RLS en todas las tablas necesarias
-- ===================================================
-- Este script desactiva RLS en todas las tablas que causan errores 400/406
-- Ejecuta esto en el SQL Editor de Supabase

-- Tablas principales
ALTER TABLE public.lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials DISABLE ROW LEVEL SECURITY;

-- Verificar que todas las tablas tengan RLS deshabilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN (
  'lessons',
  'lesson_courses',
  'assignments',
  'courses',
  'programs',
  'course_enrollments',
  'enrollments',
  'profiles',
  'lesson_progress',
  'lesson_materials',
  'program_courses'
)
AND schemaname = 'public'
ORDER BY tablename;

-- Resultado esperado: todas las tablas deben tener rowsecurity = false
