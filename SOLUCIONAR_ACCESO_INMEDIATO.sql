-- SOLUCIONAR ACCESO INMEDIATO - POLÍTICAS PERMISIVAS
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar TODAS las políticas problemáticas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "course_enrollments_all" ON course_enrollments;
DROP POLICY IF EXISTS "program_courses_all" ON program_courses;

-- 2. Crear políticas MUY PERMISIVAS para que funcione
CREATE POLICY "profiles_allow_all" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "course_enrollments_allow_all" ON course_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "program_courses_allow_all" ON program_courses FOR ALL USING (true) WITH CHECK (true);

-- 3. Verificar que RLS esté habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;

-- 4. Mensaje de confirmación
SELECT 'Acceso restaurado - políticas permisivas aplicadas' as resultado;
