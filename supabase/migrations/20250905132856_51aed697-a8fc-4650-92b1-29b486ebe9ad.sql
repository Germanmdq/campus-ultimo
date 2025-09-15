-- Crear usuario administrador directamente
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud
) VALUES (
    gen_random_uuid(),
    'germangonzalezmdq@gmail.com',
    crypt('mdygg2011', gen_salt('bf')),
    now(),
    '{"full_name": "German"}',
    now(),
    now(),
    'authenticated',
    'authenticated'
);

-- Obtener el ID del usuario recién creado y crear su perfil como admin
DO $$
DECLARE
    user_uuid uuid;
BEGIN
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'germangonzalezmdq@gmail.com';
    
    INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
    VALUES (user_uuid, 'German', 'admin', now(), now());
END $$;