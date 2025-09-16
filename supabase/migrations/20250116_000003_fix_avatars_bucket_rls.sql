-- 🔧 SOLUCIÓN COMPLETA PARA BUCKET AVATARS Y POLÍTICAS RLS
-- Esta migración configura correctamente el bucket avatars y sus políticas de seguridad

-- 1. Verificar y crear bucket avatars si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- 2. Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own avatars" ON storage.objects;

-- 3. Crear políticas RLS optimizadas para el bucket avatars

-- Política para permitir SELECT (ver archivos) - acceso público
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Política para permitir INSERT (subir archivos) - solo usuarios autenticados
CREATE POLICY "Users can upload avatars" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'avatar' -- Solo archivos que empiecen con 'avatar'
);

-- Política para permitir UPDATE (actualizar archivos) - solo el propietario
CREATE POLICY "Users can update their own avatars" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND owner = auth.uid()
);

-- Política para permitir DELETE (eliminar archivos) - solo el propietario
CREATE POLICY "Users can delete their own avatars" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND owner = auth.uid()
);

-- 4. Crear función helper para verificar configuración (opcional)
CREATE OR REPLACE FUNCTION check_avatars_bucket_config()
RETURNS TABLE (
  bucket_id text,
  bucket_name text,
  is_public boolean,
  file_size_limit bigint,
  allowed_mime_types text[],
  policy_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id::text,
    b.name::text,
    b.public,
    b.file_size_limit,
    b.allowed_mime_types,
    COUNT(p.policyname)::integer as policy_count
  FROM storage.buckets b
  LEFT JOIN pg_policies p ON p.tablename = 'objects' AND p.schemaname = 'storage'
  WHERE b.id = 'avatars'
  GROUP BY b.id, b.name, b.public, b.file_size_limit, b.allowed_mime_types;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Comentarios para documentación
COMMENT ON POLICY "Public Access" ON storage.objects IS 'Permite acceso público de lectura a archivos en el bucket avatars';
COMMENT ON POLICY "Users can upload avatars" ON storage.objects IS 'Permite a usuarios autenticados subir archivos que empiecen con "avatar"';
COMMENT ON POLICY "Users can update their own avatars" ON storage.objects IS 'Permite a usuarios actualizar solo sus propios avatares';
COMMENT ON POLICY "Users can delete their own avatars" ON storage.objects IS 'Permite a usuarios eliminar solo sus propios avatares';
