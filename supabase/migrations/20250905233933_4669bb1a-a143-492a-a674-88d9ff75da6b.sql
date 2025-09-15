-- Update RLS policies to allow teachers and admins to see all programs and courses, not just published ones

-- Drop existing policies for programs
DROP POLICY IF EXISTS "Authenticated users can view published programs" ON programs;

-- Create new policy for programs that allows teachers/admins to see all, students only published
CREATE POLICY "Users can view programs based on role" ON programs
FOR SELECT USING (
  (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  OR 
  (auth.role() = 'authenticated' AND published_at IS NOT NULL)
);

-- Drop existing policies for courses
DROP POLICY IF EXISTS "Authenticated users can view published courses" ON courses;

-- Create new policy for courses that allows teachers/admins to see all, students only published
CREATE POLICY "Users can view courses based on role" ON courses
FOR SELECT USING (
  (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  OR 
  (auth.role() = 'authenticated' AND published_at IS NOT NULL)
);