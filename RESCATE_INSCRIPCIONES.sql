-- 🚨 PAQUETE DE RESCATE PARA INSCRIPCIONES
-- Soluciona el problema de RLS + falta de profiles tras borrar usuarios

-- 1️⃣ CREAR PERFIL AUTOMÁTICAMENTE AL REGISTRARSE
-- Función que se ejecuta automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger que se ejecuta después de INSERT en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2️⃣ RLS MÍNIMAS PARA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Leer tu propio perfil
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- Insertar tu propio perfil
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- Actualizar tu propio perfil
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- 3️⃣ FUNCIÓN PARA INSCRIBIRSE A CURSOS (RPC SEGURA)
CREATE OR REPLACE FUNCTION public.enroll_in_course(p_course_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario esté autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Verificar que el curso exista
  IF NOT EXISTS (SELECT 1 FROM courses WHERE id = p_course_id) THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;
  
  -- Inscribir al usuario (evita duplicados)
  INSERT INTO public.assignments (user_id, course_id, created_at)
  VALUES (auth.uid(), p_course_id, NOW())
  ON CONFLICT (user_id, course_id) DO NOTHING;
  
  -- Log de inscripción exitosa
  RAISE NOTICE 'Usuario % inscrito en curso %', auth.uid(), p_course_id;
END;
$$;

-- Permitir que usuarios autenticados llamen la función
GRANT EXECUTE ON FUNCTION public.enroll_in_course(UUID) TO authenticated;

-- 4️⃣ RLS PARA ASSIGNMENTS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Leer solo tus inscripciones
DROP POLICY IF EXISTS assignments_select_own ON public.assignments;
CREATE POLICY assignments_select_own
ON public.assignments FOR SELECT
USING (user_id = auth.uid());

-- 5️⃣ VERIFICACIONES RÁPIDAS
-- ¿Se están creando profiles automáticamente?
SELECT 
  u.id as user_id, 
  u.email, 
  p.id as profile_id,
  p.role,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- Verificar que el trigger esté activo
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 6️⃣ PROTECCIÓN ADICIONAL
-- ON DELETE RESTRICT para evitar borrados accidentales
ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_user_id_fkey,
  ADD CONSTRAINT assignments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- 7️⃣ MENSAJE DE CONFIRMACIÓN
SELECT '✅ Paquete de rescate aplicado correctamente' as status;
SELECT '✅ Ahora puedes inscribir usuarios desde la app sin problemas' as mensaje;
