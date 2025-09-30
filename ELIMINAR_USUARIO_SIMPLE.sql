-- FUNCIÓN SIMPLE PARA ELIMINAR USUARIOS
-- Sin Edge Functions, solo SQL directo

-- 1. Crear función simple
CREATE OR REPLACE FUNCTION public.delete_user_simple(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Verificar que el usuario esté autenticado
    IF auth.uid() IS NULL THEN
        RETURN 'Error: No autenticado';
    END IF;
    
    -- Obtener rol del usuario actual
    SELECT role INTO current_user_role FROM profiles WHERE id = auth.uid();
    
    -- Verificar que sea admin
    IF current_user_role != 'admin' THEN
        RETURN 'Error: Solo administradores pueden eliminar usuarios';
    END IF;
    
    -- Verificar que el usuario a eliminar existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
        RETURN 'Error: Usuario no encontrado';
    END IF;
    
    -- No permitir auto-eliminación
    IF user_id = auth.uid() THEN
        RETURN 'Error: No puedes eliminarte a ti mismo';
    END IF;
    
    -- Eliminar usuario (esto elimina automáticamente el perfil por CASCADE)
    DELETE FROM auth.users WHERE id = user_id;
    
    RETURN 'Usuario eliminado correctamente';
END;
$func$;

-- 2. Permitir ejecución
GRANT EXECUTE ON FUNCTION public.delete_user_simple(UUID) TO authenticated;

-- 3. Mensaje de confirmación
SELECT 'Función de eliminación creada' as resultado;
