-- 🚀 CONFIGURACIÓN COMPLETA DE STORAGE PARA AVATARES
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear bucket avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear políticas RLS para avatars

-- Política de lectura pública (para mostrar avatares)
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

-- Política de subida para usuarios autenticados
CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- Política de actualización para propietarios
CREATE POLICY "Users can update their own avatars" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  owner = auth.uid()
);

-- Política de eliminación para propietarios
CREATE POLICY "Users can delete their own avatars" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  owner = auth.uid()
);

-- 3. Verificar que se creó correctamente
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

-- 4. Verificar políticas creadas
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%avatar%';

-- ✅ CONFIGURACIÓN COMPLETA
-- El bucket 'avatars' ahora está configurado con:
-- - Lectura pública para mostrar avatares
-- - Subida para usuarios autenticados
-- - Actualización/eliminación solo para propietarios
-- - Límite de 5MB por archivo
-- - Tipos MIME permitidos: jpeg, png, webp, gif
