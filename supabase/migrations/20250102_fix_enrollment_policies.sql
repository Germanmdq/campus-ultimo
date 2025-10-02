-- Corregir políticas RLS para enrollments y course_enrollments
-- Asegurar que usen los roles correctos (formador en lugar de teacher)

-- 1. Corregir políticas de course_enrollments
DROP POLICY IF EXISTS "Teachers and admins can manage course enrollments" ON public.course_enrollments;

CREATE POLICY "Formadors and admins can manage course_enrollments" 
ON public.course_enrollments 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Asegurar que existan las políticas básicas para enrollments
DROP POLICY IF EXISTS "Teachers and admins can view all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers and admins can manage enrollments" ON public.enrollments;

CREATE POLICY "Formadors and admins can view all enrollments" 
ON public.enrollments 
FOR SELECT 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Formadors and admins can manage enrollments" 
ON public.enrollments 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Asegurar que existan las políticas básicas para course_enrollments
CREATE POLICY "Formadors and admins can view all course_enrollments" 
ON public.course_enrollments 
FOR SELECT 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 4. Verificar que la función has_role funcione correctamente
-- (Ya debería existir, pero por si acaso)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

