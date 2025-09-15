-- Crear usuario estudiante Marcelo (verificando que no exista)
DO $$
DECLARE
    user_uuid uuid;
    existing_email text;
BEGIN
    -- Verificar si el email ya existe
    SELECT email INTO existing_email FROM auth.users WHERE email = 'plataformager@gmail.com';
    
    IF existing_email IS NULL THEN
        -- Crear usuario en auth.users
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
            'plataformager@gmail.com',
            crypt('mdygg2011', gen_salt('bf')),
            now(),
            '{"full_name": "Marcelo"}',
            now(),
            now(),
            'authenticated',
            'authenticated'
        );
        
        -- Obtener el ID del usuario recién creado
        SELECT id INTO user_uuid FROM auth.users WHERE email = 'plataformager@gmail.com';
        
        -- Crear perfil
        INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
        VALUES (user_uuid, 'Marcelo', 'student', now(), now());
        
    END IF;
END $$;