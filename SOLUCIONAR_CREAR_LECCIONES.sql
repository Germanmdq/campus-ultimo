-- SOLUCIÓN COMPLETA PARA CREAR LECCIONES Y ERRORES 400/406
-- Ejecutar en la consola SQL de Supabase Dashboard

-- 1. DESHABILITAR RLS EN TODAS LAS TABLAS NECESARIAS
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
    'lessons',
    'lesson_courses', 
    'courses',
    'programs',
    'course_enrollments', 
    'enrollments', 
    'profiles',
    'assignments',
    'lesson_progress',
    'lesson_materials'
) 
AND schemaname = 'public'
ORDER BY tablename;

-- 3. VERIFICAR QUE LAS TABLAS EXISTEN Y TIENEN LA ESTRUCTURA CORRECTA
-- Verificar tabla lesson_courses (relación many-to-many)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lesson_courses' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar tabla lessons
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. CREAR TABLA lesson_courses SI NO EXISTE
CREATE TABLE IF NOT EXISTS public.lesson_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, course_id)
);

-- 5. MENSAJE FINAL
SELECT 'RLS deshabilitado. Ahora deberías poder crear lecciones sin errores.' as resultado;
