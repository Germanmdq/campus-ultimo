-- 🔍 VERIFICAR TODOS LOS USUARIOS SIN PROFILES
-- Esto es lo que está causando el loop infinito

-- 1. Ver todos los usuarios y sus profiles
SELECT 
    u.id as user_id, 
    u.email, 
    p.id as profile_id,
    p.role,
    p.full_name,
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- 2. Contar usuarios sin profiles
SELECT 
    COUNT(*) as usuarios_sin_profile
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 3. Listar solo usuarios sin profiles
SELECT 
    u.id as user_id, 
    u.email, 
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
