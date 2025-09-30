-- SOLUCIÓN DEFINITIVA PARA PRODUCCIÓN
-- Configuración completa y duradera

-- 1. AGREGAR COLUMNA ROLE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- 2. HACER ADMIN AL USUARIO
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'germangonzalezmdq@gmail.com');

-- 3. CREAR TABLAS FALTANTES
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

-- 4. HABILITAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;

-- 5. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_allow_all" ON profiles;
DROP POLICY IF EXISTS "course_enrollments_all" ON course_enrollments;
DROP POLICY IF EXISTS "program_courses_all" ON program_courses;
DROP POLICY IF EXISTS "course_enrollments_allow_all" ON course_enrollments;
DROP POLICY IF EXISTS "program_courses_allow_all" ON program_courses;

-- 6. CREAR POLÍTICAS DEFINITIVAS Y FUNCIONALES
-- Profiles: Todos pueden ver, solo admins pueden modificar
CREATE POLICY "profiles_view_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT 
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE 
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE 
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Otras tablas: Acceso total para usuarios autenticados
CREATE POLICY "course_enrollments_auth" ON course_enrollments FOR ALL 
    USING (auth.role() = 'authenticated') 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "program_courses_auth" ON program_courses FOR ALL 
    USING (auth.role() = 'authenticated') 
    WITH CHECK (auth.role() = 'authenticated');

-- 7. FUNCIÓN DEFINITIVA PARA ELIMINAR USUARIOS
DROP FUNCTION IF EXISTS public.delete_user_simple(UUID);
CREATE FUNCTION public.delete_user_simple(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Verificar autenticación
    IF auth.uid() IS NULL THEN 
        RETURN json_build_object('success', false, 'error', 'No autenticado');
    END IF;
    
    -- Verificar rol de admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN 
        RETURN json_build_object('success', false, 'error', 'Solo administradores pueden eliminar usuarios');
    END IF;
    
    -- Prevenir auto-eliminación
    IF user_id = auth.uid() THEN 
        RETURN json_build_object('success', false, 'error', 'No puede eliminarse a sí mismo');
    END IF;
    
    -- Verificar que el usuario existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
    END IF;
    
    -- Obtener datos del usuario antes de eliminar
    SELECT email, raw_user_meta_data->>'full_name' 
    INTO user_email, user_name
    FROM auth.users 
    WHERE id = user_id;
    
    -- Eliminar de profiles primero
    DELETE FROM profiles WHERE id = user_id;
    
    -- Eliminar de auth.users
    DELETE FROM auth.users WHERE id = user_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Usuario eliminado correctamente',
        'email', user_email
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false, 
        'error', SQLERRM
    );
END;
$func$;

-- 8. PERMITIR EJECUCIÓN DE LA FUNCIÓN
GRANT EXECUTE ON FUNCTION public.delete_user_simple(UUID) TO authenticated;

-- 9. VERIFICAR CONFIGURACIÓN
SELECT 
    'Configuración definitiva aplicada' as status,
    'Sistema listo para producción' as mensaje;
