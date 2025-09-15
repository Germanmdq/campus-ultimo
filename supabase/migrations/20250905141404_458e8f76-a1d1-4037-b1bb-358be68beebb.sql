-- Verificar el tipo actual de la tabla auth.users para el email
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email';

-- Recrear la función con el tipo text para el email (castear el varchar a text)
DROP FUNCTION IF EXISTS public.get_users_with_emails();

CREATE FUNCTION public.get_users_with_emails()
 RETURNS TABLE(id uuid, full_name text, email text, role app_role, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    au.email::text, -- Castear explícitamente a text
    p.role,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;