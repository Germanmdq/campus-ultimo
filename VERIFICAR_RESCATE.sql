-- 🔍 CONSULTAS DE VERIFICACIÓN PARA EL SCRIPT DE RESCATE
-- Ejecuta estas consultas en Supabase para verificar que todo funcionó

-- 1️⃣ VERIFICAR QUE LA FUNCIÓN handle_new_user EXISTE
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- 2️⃣ VERIFICAR USUARIOS Y PROFILES (MUY IMPORTANTE)
-- Si profile_id sale NULL, el trigger no funcionó
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

-- 3️⃣ VERIFICAR QUE LA FUNCIÓN enroll_in_course EXISTE
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'enroll_in_course';

-- 4️⃣ VERIFICAR POLÍTICAS RLS DE PROFILES
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 5️⃣ VERIFICAR POLÍTICAS RLS DE ASSIGNMENTS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'assignments';

-- 6️⃣ VERIFICAR QUE EL TRIGGER ESTÁ ACTIVO
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 7️⃣ VERIFICAR CURSOS DISPONIBLES
SELECT id, title, description 
FROM courses 
LIMIT 5;

-- 8️⃣ VERIFICAR ASSIGNMENTS EXISTENTES
SELECT 
  a.id,
  a.user_id,
  a.course_id,
  c.title as course_title,
  a.created_at
FROM assignments a
LEFT JOIN courses c ON c.id = a.course_id
ORDER BY a.created_at DESC
LIMIT 5;
