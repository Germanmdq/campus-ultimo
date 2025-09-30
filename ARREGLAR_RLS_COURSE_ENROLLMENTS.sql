-- El error 400 en course_enrollments es por RLS
-- Deshabilitar RLS temporalmente para solucionar los errores

ALTER TABLE public.course_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;

-- Verificar que se deshabilitó
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('course_enrollments', 'enrollments') 
AND schemaname = 'public';
