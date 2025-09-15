-- Actualizar usuario plataformager@gmail.com a rol admin
UPDATE public.profiles 
SET role = 'admin'::app_role, 
    full_name = 'Marcelo'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'plataformager@gmail.com' 
  LIMIT 1
);

-- Verificar el resultado
SELECT p.id, p.full_name, p.role, au.email
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'plataformager@gmail.com';