-- SOLUCIÓN FINAL COMPLETA - TODO EN UNO

-- 1. Agregar columna role
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- 2. Hacer admin
UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'germangonzalezmdq@gmail.com');

-- 3. Crear tablas faltantes
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.program_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, course_id)
);

-- 4. RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;

-- 5. Políticas
CREATE POLICY "course_enrollments_all" ON course_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "program_courses_all" ON program_courses FOR ALL USING (true) WITH CHECK (true);

-- 6. Función eliminar usuario
DROP FUNCTION IF EXISTS public.delete_user_simple(UUID);
CREATE FUNCTION public.delete_user_simple(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    IF auth.uid() IS NULL THEN RETURN 'Error: No autenticado'; END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN RETURN 'Error: Solo admin'; END IF;
    IF user_id = auth.uid() THEN RETURN 'Error: No auto-eliminación'; END IF;
    DELETE FROM auth.users WHERE id = user_id;
    RETURN 'Usuario eliminado';
END;
$func$;

GRANT EXECUTE ON FUNCTION public.delete_user_simple(UUID) TO authenticated;

SELECT 'TODO LISTO' as resultado;
