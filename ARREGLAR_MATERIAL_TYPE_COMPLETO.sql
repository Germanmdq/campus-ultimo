-- ===================================================
-- ARREGLAR MATERIAL_TYPE COMPLETO
-- ===================================================
-- Este script agrega la columna material_type y actualiza los datos existentes

-- 1. Agregar columna material_type si no existe
ALTER TABLE public.lesson_materials 
ADD COLUMN IF NOT EXISTS material_type text;

-- 2. Actualizar materiales existentes basándose en si tienen file_url o url
UPDATE public.lesson_materials 
SET material_type = CASE 
  WHEN file_url IS NOT NULL AND file_url != '' THEN 'file'
  WHEN url IS NOT NULL AND url != '' THEN 'link'
  ELSE 'link' -- default para materiales sin datos claros
END
WHERE material_type IS NULL;

-- 3. Establecer valor por defecto para futuros inserts
ALTER TABLE public.lesson_materials 
ALTER COLUMN material_type SET DEFAULT 'file';

-- 4. Deshabilitar RLS en lesson_materials
ALTER TABLE public.lesson_materials DISABLE ROW LEVEL SECURITY;

-- 5. Verificar que la columna existe y tiene datos
SELECT 
  id, 
  title, 
  material_type, 
  file_url, 
  url,
  CASE 
    WHEN file_url IS NOT NULL AND file_url != '' THEN 'file'
    WHEN url IS NOT NULL AND url != '' THEN 'link'
    ELSE 'unknown'
  END as detected_type
FROM public.lesson_materials 
ORDER BY created_at DESC
LIMIT 10;

-- 6. Verificar RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'lesson_materials'
AND schemaname = 'public';
