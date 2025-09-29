-- Script para corregir políticas RLS y permitir acceso al admin
-- Ejecutar en la consola SQL de Supabase

-- 1. Verificar el usuario admin
SELECT 
    u.email,
    p.role,
    p.full_name,
    u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'germangonzalezmdq@gmail.com';

-- 2. Asegurar que el usuario tenga rol admin
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'germangonzalezmdq@gmail.com'
);

-- 3. Crear perfil si no existe
INSERT INTO profiles (id, full_name, role, created_at, updated_at)
SELECT 
    u.id,
    'Germán González',
    'admin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'germangonzalezmdq@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- 4. Políticas RLS para profiles - Permitir acceso a admins
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 5. Políticas RLS para forums - Permitir acceso a admins
DROP POLICY IF EXISTS "Admins can view all forums" ON forums;
CREATE POLICY "Admins can view all forums" ON forums
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 6. Políticas RLS para forum_posts - Permitir acceso a admins
DROP POLICY IF EXISTS "Admins can view all posts" ON forum_posts;
CREATE POLICY "Admins can view all posts" ON forum_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 7. Políticas RLS para forum_post_replies - Permitir acceso a admins
DROP POLICY IF EXISTS "Admins can view all replies" ON forum_post_replies;
CREATE POLICY "Admins can view all replies" ON forum_post_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 8. Verificar que el usuario tenga acceso
SELECT 
    u.email,
    p.role,
    p.full_name,
    'Admin access granted' as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'germangonzalezmdq@gmail.com';
