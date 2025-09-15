-- Verificar y crear usuario Marcelo si no existe
DO $$
DECLARE
    user_uuid uuid;
    profile_exists boolean := false;
BEGIN
    -- Verificar si ya existe el perfil
    SELECT EXISTS(SELECT 1 FROM profiles p 
                  JOIN auth.users au ON p.id = au.id 
                  WHERE au.email = 'plataformager@gmail.com') INTO profile_exists;
    
    IF NOT profile_exists THEN
        -- Crear usuario en auth.users si no existe
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
        )
        ON CONFLICT (email) DO NOTHING;
        
        -- Obtener el ID del usuario 
        SELECT id INTO user_uuid FROM auth.users WHERE email = 'plataformager@gmail.com';
        
        -- Crear perfil si el usuario existe y no tiene perfil
        IF user_uuid IS NOT NULL THEN
            INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
            VALUES (user_uuid, 'Marcelo', 'student', now(), now())
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
END $$;