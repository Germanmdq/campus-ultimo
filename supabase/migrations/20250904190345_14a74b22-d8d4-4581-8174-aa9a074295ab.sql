-- Crear políticas para el bucket materials
CREATE POLICY "Anyone can view materials" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'materials');

CREATE POLICY "Authenticated users can upload materials" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own materials" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own materials" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'materials' AND auth.role() = 'authenticated');