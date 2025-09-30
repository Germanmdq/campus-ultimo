-- Solucionar problemas de login con políticas RLS más permisivas
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "View profiles policy" ON profiles;
DROP POLICY IF EXISTS "Update profiles policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "All authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

-- 2. Crear políticas muy permisivas para que funcione el login
CREATE POLICY "profiles_select_permissive" ON profiles
    FOR SELECT
    USING (true);

CREATE POLICY "profiles_insert_permissive" ON profiles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "profiles_update_permissive" ON profiles
    FOR UPDATE
    USING (true);

CREATE POLICY "profiles_delete_permissive" ON profiles
    FOR DELETE
    USING (true);

-- 3. Verificar que RLS esté habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
