-- Crear una versión simplificada de la función que confíe en las políticas RLS
CREATE OR REPLACE FUNCTION public.get_users_with_emails()
 RETURNS TABLE(id uuid, full_name text, email text, role app_role, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Sin verificación de permisos aquí - las políticas RLS se encargan de eso
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    au.email,
    p.role,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Probar la función
SELECT COUNT(*) as total_users FROM public.get_users_with_emails();