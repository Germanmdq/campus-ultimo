-- 🔑 PERMITIR QUE ADMINISTRADORES ELIMINEN USUARIOS
-- Ejecutar en Supabase SQL Editor

-- 1️⃣ CREAR FUNCIÓN PARA ELIMINAR USUARIOS (SOLO ADMIN)
CREATE OR REPLACE FUNCTION public.delete_user(user_id_to_delete UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Verificar que el usuario esté autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    
    -- Obtener el rol del usuario actual
    SELECT role INTO current_user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Verificar que sea administrador
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Solo los administradores pueden eliminar usuarios';
    END IF;
    
    -- Verificar que el usuario a eliminar existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_to_delete) THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    
    -- No permitir que se elimine a sí mismo
    IF user_id_to_delete = auth.uid() THEN
        RAISE EXCEPTION 'No puedes eliminarte a ti mismo';
    END IF;
    
    -- Eliminar el usuario (esto eliminará automáticamente el perfil por CASCADE)
    DELETE FROM auth.users WHERE id = user_id_to_delete;
    
    RAISE NOTICE 'Usuario % eliminado correctamente', user_id_to_delete;
END;
$$;

-- 2️⃣ PERMITIR EJECUCIÓN DE LA FUNCIÓN
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;

-- 3️⃣ CREAR FUNCIÓN PARA LISTAR USUARIOS (SOLO ADMIN)
CREATE OR REPLACE FUNCTION public.list_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Verificar que el usuario esté autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    
    -- Obtener el rol del usuario actual
    SELECT role INTO current_user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Verificar que sea administrador
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Solo los administradores pueden ver la lista de usuarios';
    END IF;
    
    -- Devolver lista de usuarios
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        COALESCE(p.full_name, 'Sin nombre') as full_name,
        COALESCE(p.role, 'student') as role,
        u.created_at
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    ORDER BY u.created_at DESC;
END;
$$;

-- 3️⃣ PERMITIR EJECUCIÓN DE LA FUNCIÓN
GRANT EXECUTE ON FUNCTION public.list_users() TO authenticated;

-- 4️⃣ CREAR FUNCIÓN PARA CAMBIAR ROL DE USUARIO (SOLO ADMIN)
CREATE OR REPLACE FUNCTION public.change_user_role(
    user_id_to_change UUID,
    new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role TEXT;
    valid_roles TEXT[] := ARRAY['student', 'formador', 'voluntario', 'admin'];
BEGIN
    -- Verificar que el usuario esté autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    
    -- Obtener el rol del usuario actual
    SELECT role INTO current_user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Verificar que sea administrador
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Solo los administradores pueden cambiar roles';
    END IF;
    
    -- Verificar que el rol sea válido
    IF new_role != ALL(valid_roles) THEN
        RAISE EXCEPTION 'Rol inválido. Roles válidos: student, formador, voluntario, admin';
    END IF;
    
    -- Verificar que el usuario a cambiar existe
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_change) THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    
    -- Actualizar el rol
    UPDATE profiles 
    SET 
        role = new_role,
        updated_at = NOW()
    WHERE id = user_id_to_change;
    
    RAISE NOTICE 'Rol del usuario % cambiado a %', user_id_to_change, new_role;
END;
$$;

-- 4️⃣ PERMITIR EJECUCIÓN DE LA FUNCIÓN
GRANT EXECUTE ON FUNCTION public.change_user_role(UUID, TEXT) TO authenticated;

-- 5️⃣ MENSAJE DE CONFIRMACIÓN
SELECT '✅ Funciones de administración creadas' as status;
SELECT '✅ delete_user(UUID) - Eliminar usuarios' as funcion1;
SELECT '✅ list_users() - Listar usuarios' as funcion2;
SELECT '✅ change_user_role(UUID, TEXT) - Cambiar roles' as funcion3;
