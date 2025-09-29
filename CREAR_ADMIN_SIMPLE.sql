-- Script simplificado para crear administradores
-- Ejecutar en la consola SQL de Supabase

-- 1. Verificar usuarios existentes
SELECT 
    u.email,
    p.role,
    p.full_name,
    u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- 2. Función simple para crear administrador
CREATE OR REPLACE FUNCTION crear_admin(email_usuario TEXT)
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
        RETURN 'Error: Usuario no encontrado';
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
$$ LANGUAGE plpgsql;

-- 3. Función para listar administradores
CREATE OR REPLACE FUNCTION listar_admins()
RETURNS TABLE (
    email TEXT,
    full_name TEXT,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email::TEXT,
        p.full_name,
        p.role
    FROM auth.users u
    JOIN profiles p ON u.id = p.id
    WHERE p.role = 'admin';
END;
$$ LANGUAGE plpgsql;

-- 4. Probar las funciones
SELECT 'Funciones creadas correctamente' as status;

-- 5. Listar administradores actuales
SELECT * FROM listar_admins();
