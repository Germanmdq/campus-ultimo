-- Arreglar error 400 de RLS - Versión Simple
-- Ejecutar línea por línea en la consola SQL de Supabase

-- 1. Deshabilitar RLS en course_enrollments
ALTER TABLE public.course_enrollments DISABLE ROW LEVEL SECURITY;

-- 2. Deshabilitar RLS en enrollments
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que se deshabilitó
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('course_enrollments', 'enrollments') 
AND schemaname = 'public';
