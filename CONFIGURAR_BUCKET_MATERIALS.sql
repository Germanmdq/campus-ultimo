-- ===================================================
-- CONFIGURAR BUCKET MATERIALS PARA ARCHIVOS
-- ===================================================
-- Este script configura el bucket de materiales en Supabase Storage

-- 1. Crear bucket materials si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Configurar políticas RLS para el bucket materials
-- Política para SELECT (leer archivos)
CREATE POLICY "materials_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'materials');

-- Política para INSERT (subir archivos)
CREATE POLICY "materials_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'materials');

-- Política para UPDATE (actualizar archivos)
CREATE POLICY "materials_update_policy" ON storage.objects
FOR UPDATE USING (bucket_id = 'materials');

-- Política para DELETE (eliminar archivos)
CREATE POLICY "materials_delete_policy" ON storage.objects
FOR DELETE USING (bucket_id = 'materials');

-- 3. Verificar que el bucket existe
SELECT * FROM storage.buckets WHERE id = 'materials';
