-- Crear bucket para subida de imágenes de programas y cursos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('program-images', 'program-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para subida de imágenes (solo admins y teachers)
CREATE POLICY "Admins and teachers can upload program images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'program-images' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

CREATE POLICY "Anyone can view program images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'program-images');

CREATE POLICY "Admins and teachers can update program images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'program-images' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

CREATE POLICY "Admins and teachers can delete program images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'program-images' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);