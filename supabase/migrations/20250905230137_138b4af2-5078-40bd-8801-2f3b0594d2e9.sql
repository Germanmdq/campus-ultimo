-- First remove the default constraint
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Update app_role enum to change teacher to formador and add voluntario
ALTER TYPE app_role RENAME TO app_role_old;

CREATE TYPE app_role AS ENUM ('student', 'formador', 'voluntario', 'admin');

-- Update existing profiles to use new enum
ALTER TABLE profiles 
ALTER COLUMN role TYPE app_role USING 
CASE 
  WHEN role::text = 'teacher' THEN 'formador'::app_role
  WHEN role::text = 'student' THEN 'student'::app_role  
  WHEN role::text = 'admin' THEN 'admin'::app_role
  ELSE 'student'::app_role
END;

-- Now set the new default value
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'student'::app_role;

-- Drop old enum
DROP TYPE app_role_old;

-- Update the has_role function to work with new roles
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

-- Update RLS policies to use 'formador' instead of 'teacher'
-- Drop and recreate policies for assignments table
DROP POLICY IF EXISTS "Teachers and admins can update assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers and admins can view assignments" ON assignments;

CREATE POLICY "Formadors and admins can update assignments" 
ON assignments 
FOR UPDATE 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Formadors and admins can view assignments" 
ON assignments 
FOR SELECT 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update policies for other tables
DROP POLICY IF EXISTS "Teachers and admins can manage courses" ON courses;
CREATE POLICY "Formadors and admins can manage courses" 
ON courses 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Teachers and admins can manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "Teachers and admins can view all enrollments" ON enrollments;

CREATE POLICY "Formadors and admins can manage enrollments" 
ON enrollments 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Formadors and admins can view all enrollments" 
ON enrollments 
FOR SELECT 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Teachers and admins can manage events" ON events;
CREATE POLICY "Formadors and admins can manage events" 
ON events 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view events based on visibility" ON events;
CREATE POLICY "Users can view events based on visibility" 
ON events 
FOR SELECT 
USING ((auth.role() = 'authenticated'::text) AND (
  (visibility = 'all'::event_visibility) OR 
  ((visibility = 'students'::event_visibility) AND has_role(auth.uid(), 'student'::app_role)) OR 
  ((visibility = 'teachers'::event_visibility) AND (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
));

DROP POLICY IF EXISTS "Teachers and admins can manage forums" ON forums;
CREATE POLICY "Formadors and admins can manage forums" 
ON forums 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Teachers and admins can manage materials" ON lesson_materials;
CREATE POLICY "Formadors and admins can manage materials" 
ON lesson_materials 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Teachers and admins can view all progress" ON lesson_progress;
CREATE POLICY "Formadors and admins can view all progress" 
ON lesson_progress 
FOR SELECT 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Teachers and admins can manage lessons" ON lessons;
CREATE POLICY "Formadors and admins can manage lessons" 
ON lessons 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Teachers and admins can manage program courses" ON program_courses;
CREATE POLICY "Formadors and admins can manage program courses" 
ON program_courses 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Teachers and admins can manage programs" ON programs;
CREATE POLICY "Formadors and admins can manage programs" 
ON programs 
FOR ALL 
USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Formadors and admins can view profiles" 
ON profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'formador'::app_role) OR (auth.uid() = id));

DROP POLICY IF EXISTS "Teachers and admins can update profiles" ON profiles;
CREATE POLICY "Formadors and admins can update profiles" 
ON profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'formador'::app_role) OR (auth.uid() = id));