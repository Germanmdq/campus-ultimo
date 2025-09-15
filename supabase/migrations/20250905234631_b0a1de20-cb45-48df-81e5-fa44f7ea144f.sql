-- Arreglar el curso que no tiene program_id asignado
UPDATE courses 
SET program_id = (SELECT id FROM programs LIMIT 1)
WHERE program_id IS NULL;

-- Simplificar las políticas RLS para que admins vean TODOS los datos
DROP POLICY IF EXISTS "Users can view programs based on role" ON programs;
DROP POLICY IF EXISTS "Users can view courses based on role" ON courses;

-- Nueva política simple para programas: admins ven todo, otros solo publicados
CREATE POLICY "View programs policy" ON programs
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR (auth.role() = 'authenticated' AND published_at IS NOT NULL)
);

-- Nueva política simple para cursos: admins ven todo, otros solo publicados  
CREATE POLICY "View courses policy" ON courses
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR (auth.role() = 'authenticated' AND published_at IS NOT NULL)
);