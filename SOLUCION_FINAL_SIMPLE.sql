-- SOLUCIÓN FINAL SIMPLE - SIN LOOPS
-- Solo lo esencial para que funcione

-- 1. Agregar columna role si no existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- 2. Hacer admin al usuario
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'germangonzalezmdq@gmail.com');

-- 3. Eliminar función existente y crear nueva
DROP FUNCTION IF EXISTS public.delete_user(UUID);
CREATE FUNCTION public.delete_user(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    DELETE FROM auth.users WHERE id = user_id;
    RETURN 'Usuario eliminado';
END;
$func$;

-- 4. Permitir ejecución
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;

-- 5. Mensaje final
SELECT 'Listo' as resultado;
