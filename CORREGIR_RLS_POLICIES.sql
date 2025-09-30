-- Corregir políticas RLS que causan error 400
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 2. Eliminar políticas problemáticas
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- 3. Crear políticas RLS correctas para profiles
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            -- Admin puede ver todos
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
            OR
            -- Usuario puede ver su propio perfil
            id = auth.uid()
        )
    );

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            -- Admin puede crear cualquier perfil
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
            OR
            -- Usuario puede crear su propio perfil
            id = auth.uid()
        )
    );

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND (
            -- Admin puede actualizar cualquier perfil
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
            OR
            -- Usuario puede actualizar su propio perfil
            id = auth.uid()
        )
    );

CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND (
            -- Solo admin puede eliminar perfiles
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- 4. Verificar que RLS esté habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';