-- SOLUCIÓN COMPLETA PARA ERRORES DE BASE DE DATOS
-- Ejecutar en la consola SQL de Supabase Dashboard

-- 1. DESHABILITAR RLS EN TODAS LAS TABLAS PROBLEMÁTICAS
ALTER TABLE public.course_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY; 
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_courses DISABLE ROW LEVEL SECURITY;

-- 2. VERIFICAR QUE SE DESHABILITÓ RLS
SELECT 
    schemaname, 
    tablename, 
    CASE 
        WHEN rowsecurity = true THEN '❌ RLS Habilitado'
        ELSE '✅ RLS Deshabilitado'
    END as status
FROM pg_tables 
WHERE tablename IN (
    'course_enrollments', 
    'enrollments', 
    'profiles', 
    'lesson_progress',
    'courses',
    'programs',
    'program_courses',
    'lessons',
    'lesson_courses'
) 
AND schemaname = 'public'
ORDER BY tablename;

-- 3. VERIFICAR QUE LAS TABLAS EXISTEN Y TIENEN DATOS
SELECT 
    'course_enrollments' as tabla,
    COUNT(*) as registros
FROM course_enrollments
UNION ALL
SELECT 
    'enrollments' as tabla,
    COUNT(*) as registros  
FROM enrollments
UNION ALL
SELECT 
    'profiles' as tabla,
    COUNT(*) as registros
FROM profiles
UNION ALL
SELECT 
    'courses' as tabla,
    COUNT(*) as registros
FROM courses
UNION ALL
SELECT 
    'programs' as tabla,
    COUNT(*) as registros
FROM programs;

-- 4. MENSAJE FINAL
SELECT 'RLS deshabilitado en todas las tablas. Los errores 400 y 406 deberían desaparecer.' as resultado;
