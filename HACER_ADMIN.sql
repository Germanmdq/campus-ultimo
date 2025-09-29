-- Script para hacer administrador a germangonzalezmdq@gmail.com
-- Ejecutar en la consola SQL de Supabase

-- 1. Verificar si el usuario existe
SELECT 
    u.email,
    p.role,
    p.full_name,
    u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'germangonzalezmdq@gmail.com';

-- 2. Si el usuario existe, actualizar su rol a admin
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'germangonzalezmdq@gmail.com'
);

-- 3. Si el usuario no existe en profiles, crear el perfil
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

-- 4. Verificar el resultado
SELECT 
    u.email,
    p.role,
    p.full_name,
    u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'germangonzalezmdq@gmail.com';
