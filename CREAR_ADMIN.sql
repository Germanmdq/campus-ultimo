-- Script para que el administrador pueda crear otros administradores
-- Ejecutar en la consola SQL de Supabase

-- FUNCIÓN: Crear administrador desde email
CREATE OR REPLACE FUNCTION crear_administrador(email_usuario TEXT)
RETURNS TEXT AS $$
DECLARE
    user_id UUID;
    resultado TEXT;
BEGIN
    -- Buscar el usuario por email
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = email_usuario;
    
    -- Si el usuario no existe, retornar error
    IF user_id IS NULL THEN
        RETURN 'Error: Usuario no encontrado con email ' || email_usuario;
    END IF;
    
    -- Actualizar o crear perfil como admin
    INSERT INTO profiles (id, full_name, role, created_at, updated_at)
    VALUES (user_id, 'Administrador', 'admin', NOW(), NOW())
    ON CONFLICT (id) 
    DO UPDATE SET 
        role = 'admin',
        updated_at = NOW();
    
    RETURN 'Usuario ' || email_usuario || ' ahora es administrador';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Listar todos los administradores
CREATE OR REPLACE FUNCTION listar_administradores()
RETURNS TABLE (
    email TEXT,
    full_name TEXT,
    role TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email::TEXT,
        p.full_name,
        p.role,
        u.created_at
    FROM auth.users u
    JOIN profiles p ON u.id = p.id
    WHERE p.role = 'admin'
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Remover administrador (cambiar a estudiante)
CREATE OR REPLACE FUNCTION remover_administrador(email_usuario TEXT)
RETURNS TEXT AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Buscar el usuario por email
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = email_usuario;
    
    -- Si el usuario no existe, retornar error
    IF user_id IS NULL THEN
        RETURN 'Error: Usuario no encontrado con email ' || email_usuario;
    END IF;
    
    -- Cambiar rol a estudiante
    UPDATE profiles 
    SET role = 'student', updated_at = NOW()
    WHERE id = user_id;
    
    RETURN 'Usuario ' || email_usuario || ' ya no es administrador';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- EJEMPLOS DE USO:

-- 1. Crear administrador
-- SELECT crear_administrador('nuevo-admin@ejemplo.com');

-- 2. Listar todos los administradores
-- SELECT * FROM listar_administradores();

-- 3. Remover administrador
-- SELECT remover_administrador('usuario@ejemplo.com');

-- 4. Verificar administradores actuales
SELECT * FROM listar_administradores();
