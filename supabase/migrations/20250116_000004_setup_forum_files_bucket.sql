-- 🔧 CONFIGURACIÓN COMPLETA PARA BUCKET FORUM-FILES
-- Esta migración configura el bucket para archivos del foro con políticas RLS

-- 1. Crear bucket forum-files si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-files',
  'forum-files',
  true,
  10485760, -- 10MB limit (más grande que avatars para archivos del foro)
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4', 'video/avi', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4', 'video/avi', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]::text[];

-- 2. Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Public Access" ON storage.objects WHERE bucket_id = 'forum-files';
DROP POLICY IF EXISTS "Users can upload forum files" ON storage.objects WHERE bucket_id = 'forum-files';
DROP POLICY IF EXISTS "Users can update forum files" ON storage.objects WHERE bucket_id = 'forum-files';
DROP POLICY IF EXISTS "Users can delete forum files" ON storage.objects WHERE bucket_id = 'forum-files';

-- 3. Crear políticas RLS para el bucket forum-files

-- Política para permitir SELECT (ver archivos) - acceso público
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'forum-files');

-- Política para permitir INSERT (subir archivos) - solo usuarios autenticados
CREATE POLICY "Users can upload forum files" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'forum-files' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir UPDATE (actualizar archivos) - solo usuarios autenticados
CREATE POLICY "Users can update forum files" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'forum-files' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir DELETE (eliminar archivos) - solo usuarios autenticados
CREATE POLICY "Users can delete forum files" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'forum-files' 
  AND auth.role() = 'authenticated'
);

-- 4. Verificar que el bucket se creó correctamente
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'forum-files';
