-- 🔧 CREAR PROFILE FALTANTE PARA ADMIN@TEST.COM
-- Este usuario no tiene profile asociado, causando el loop infinito

-- 1. Crear el profile para admin@test.com
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
    'a641f098-67d9-458e-843c-de6b0a1be677',
    'admin@test.com',
    'Administrador Test',
    'admin',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 2. Verificar que se creó correctamente
SELECT 
    u.id as user_id, 
    u.email, 
    p.id as profile_id,
    p.role,
    p.full_name,
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'admin@test.com';

-- 3. Verificar que no hay más usuarios sin profiles
SELECT 
    u.id as user_id, 
    u.email, 
    p.id as profile_id,
    p.role,
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4. Mensaje de confirmación
SELECT '✅ Profile creado para admin@test.com' as status;
