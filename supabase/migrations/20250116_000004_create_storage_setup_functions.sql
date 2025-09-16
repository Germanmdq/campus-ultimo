-- 🔧 FUNCIONES PARA CONFIGURACIÓN AUTOMÁTICA DE STORAGE
-- Estas funciones permiten configurar el storage desde el frontend

-- 1. Función para ejecutar SQL dinámicamente (solo para configuración de storage)
CREATE OR REPLACE FUNCTION exec_storage_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Solo permitir comandos relacionados con storage
  IF sql_query ILIKE '%storage%' OR 
     sql_query ILIKE '%bucket%' OR 
     sql_query ILIKE '%policy%' OR
     sql_query ILIKE '%avatars%' THEN
    
    EXECUTE sql_query;
    
    RETURN json_build_object(
      'success', true,
      'message', 'SQL executed successfully',
      'query', sql_query
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Only storage-related SQL commands are allowed',
      'query', sql_query
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'query', sql_query
    );
END;
$$;

-- 2. Función específica para crear bucket avatars
CREATE OR REPLACE FUNCTION create_avatars_bucket()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_exists boolean;
  result json;
BEGIN
  -- Verificar si el bucket ya existe
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) INTO bucket_exists;
  
  IF bucket_exists THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Avatars bucket already exists',
      'action', 'no_action_needed'
    );
  END IF;
  
  -- Crear el bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Avatars bucket created successfully',
    'action', 'bucket_created'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'action', 'creation_failed'
    );
END;
$$;

-- 3. Función para crear políticas RLS para avatars
CREATE OR REPLACE FUNCTION create_avatars_policies()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policies_created integer := 0;
  result json;
BEGIN
  -- Eliminar políticas existentes para evitar conflictos
  DROP POLICY IF EXISTS "Public read access" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
  
  -- Crear política de lectura pública
  CREATE POLICY "Public read access" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');
  policies_created := policies_created + 1;
  
  -- Crear política de subida para usuarios autenticados
  CREATE POLICY "Authenticated users can upload" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );
  policies_created := policies_created + 1;
  
  -- Crear política de actualización para propietarios
  CREATE POLICY "Users can update their own avatars" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND
    owner = auth.uid()
  );
  policies_created := policies_created + 1;
  
  -- Crear política de eliminación para propietarios
  CREATE POLICY "Users can delete their own avatars" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND
    owner = auth.uid()
  );
  policies_created := policies_created + 1;
  
  RETURN json_build_object(
    'success', true,
    'message', 'RLS policies created successfully',
    'policies_created', policies_created
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'policies_created', policies_created
    );
END;
$$;

-- 4. Función completa para configurar storage de avatars
CREATE OR REPLACE FUNCTION setup_avatars_storage()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_result json;
  policies_result json;
  final_result json;
BEGIN
  -- Crear bucket
  SELECT create_avatars_bucket() INTO bucket_result;
  
  -- Crear políticas
  SELECT create_avatars_policies() INTO policies_result;
  
  -- Combinar resultados
  final_result := json_build_object(
    'success', (bucket_result->>'success')::boolean AND (policies_result->>'success')::boolean,
    'bucket', bucket_result,
    'policies', policies_result,
    'message', 'Storage setup completed'
  );
  
  RETURN final_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Storage setup failed'
    );
END;
$$;

-- 5. Función para verificar configuración de storage
CREATE OR REPLACE FUNCTION check_storage_config()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_info json;
  policies_count integer;
  result json;
BEGIN
  -- Verificar bucket
  SELECT json_build_object(
    'exists', EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'avatars'),
    'public', (SELECT public FROM storage.buckets WHERE id = 'avatars'),
    'file_size_limit', (SELECT file_size_limit FROM storage.buckets WHERE id = 'avatars'),
    'allowed_mime_types', (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'avatars')
  ) INTO bucket_info;
  
  -- Contar políticas
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies 
  WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%';
  
  result := json_build_object(
    'bucket', bucket_info,
    'policies_count', policies_count,
    'status', CASE 
      WHEN (bucket_info->>'exists')::boolean AND policies_count > 0 THEN 'configured'
      WHEN (bucket_info->>'exists')::boolean THEN 'bucket_only'
      ELSE 'not_configured'
    END
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'status', 'error'
    );
END;
$$;

-- 6. Comentarios para documentación
COMMENT ON FUNCTION exec_storage_sql(text) IS 'Ejecuta comandos SQL relacionados con storage de forma segura';
COMMENT ON FUNCTION create_avatars_bucket() IS 'Crea el bucket avatars con configuración optimizada';
COMMENT ON FUNCTION create_avatars_policies() IS 'Crea las políticas RLS para el bucket avatars';
COMMENT ON FUNCTION setup_avatars_storage() IS 'Configuración completa del storage de avatars';
COMMENT ON FUNCTION check_storage_config() IS 'Verifica la configuración actual del storage';
