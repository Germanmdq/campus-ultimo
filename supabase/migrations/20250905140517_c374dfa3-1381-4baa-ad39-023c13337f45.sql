-- Arreglar las políticas RLS para que los administradores puedan ver todos los perfiles
-- Primero eliminamos las políticas existentes que pueden estar causando problemas
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreamos la política con mejor lógica
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role) OR
  auth.uid() = id
);

-- También permitimos que admins y teachers puedan actualizar perfiles
CREATE POLICY "Teachers and admins can update profiles" ON public.profiles
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role) OR
  auth.uid() = id
);