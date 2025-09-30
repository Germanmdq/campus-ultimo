-- Verificar que existe
SELECT proname, prorettype::regtype 
FROM pg_proc 
WHERE proname = 'delete_user_simple';

-- Recrear función con retorno JSONB correcto
DROP FUNCTION IF EXISTS public.delete_user_simple(UUID);

CREATE OR REPLACE FUNCTION public.delete_user_simple(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Verificar autenticación
  IF auth.uid() IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;
  
  -- Verificar rol de admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Permisos insuficientes');
  END IF;
  
  -- Prevenir auto-eliminación
  IF user_id = auth.uid() THEN 
    RETURN jsonb_build_object('success', false, 'error', 'No puede eliminarse a sí mismo');
  END IF;
  
  -- Verificar que el usuario existe
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;
  
  -- Eliminar
  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Usuario eliminado', 'email', user_email);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_simple(UUID) TO authenticated;
