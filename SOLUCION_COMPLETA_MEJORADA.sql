-- SOLUCIÓN COMPLETA MEJORADA - FUNCIÓN DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna role si no existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- 2. Hacer admin al usuario
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'germangonzalezmdq@gmail.com');

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

-- 4. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Políticas para otras tablas (eliminar existentes primero)
DROP POLICY IF EXISTS "course_enrollments_all" ON course_enrollments;
DROP POLICY IF EXISTS "program_courses_all" ON program_courses;

CREATE POLICY "course_enrollments_all" ON course_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "program_courses_all" ON program_courses FOR ALL USING (true) WITH CHECK (true);

-- 7. Función mejorada para eliminar usuarios
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
    RETURN json_build_object('success', false, 'error', 'Permisos insuficientes');
  END IF;
  
  -- Prevenir auto-eliminación
  IF user_id = auth.uid() THEN 
    RETURN json_build_object('success', false, 'error', 'No puede eliminarse a sí mismo');
  END IF;
  
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;
  
  -- Obtener datos del usuario antes de eliminar (para logs)
  SELECT email, raw_user_meta_data->>'full_name' 
  INTO user_email, user_name
  FROM auth.users 
  WHERE id = user_id;
  
  -- Eliminar de profiles primero (por foreign key)
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

-- 8. Permitir ejecución de la función
GRANT EXECUTE ON FUNCTION public.delete_user_simple(UUID) TO authenticated;

-- 9. Mensaje de confirmación
SELECT 'Solución completa implementada' as resultado;
