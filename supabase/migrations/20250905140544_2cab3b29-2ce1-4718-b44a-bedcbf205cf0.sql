-- Primero veamos la función actual
SELECT pg_get_functiondef(oid)
FROM pg_proc 
WHERE proname = 'get_users_with_emails';

-- Recrear la función con mejor lógica
CREATE OR REPLACE FUNCTION public.get_users_with_emails()
 RETURNS TABLE(id uuid, full_name text, email text, role app_role, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar si el usuario autenticado es admin o teacher
  IF NOT (
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin'::app_role, 'teacher'::app_role)
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para ver esta información';
  END IF;

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