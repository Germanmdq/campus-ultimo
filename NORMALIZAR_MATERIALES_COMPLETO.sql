-- ===================================================
-- NORMALIZAR MATERIALES - SOLUCIÓN QUIRÚRGICA
-- ===================================================

-- 1) Asegurar columna material_type
ALTER TABLE public.lesson_materials
  ADD COLUMN IF NOT EXISTS material_type text;

-- 2) Normalizar datos existentes:
--    si hay file_url → file; si hay url → link
UPDATE public.lesson_materials
SET material_type = CASE
  WHEN coalesce(file_url, '') <> '' THEN 'file'
  WHEN coalesce(url, '') <> '' THEN 'link'
  ELSE 'file'  -- default para materiales sin datos claros
END
WHERE material_type IS NULL OR material_type NOT IN ('file','link','video');

-- 3) Regla de integridad: si es file → url debe ser NULL
UPDATE public.lesson_materials
SET url = NULL
WHERE material_type = 'file' AND url IS NOT NULL;

-- 4) Regla de integridad: si es link → file_url debe ser NULL
UPDATE public.lesson_materials
SET file_url = NULL
WHERE material_type = 'link' AND file_url IS NOT NULL;

-- 5) Verificar resultado
SELECT id, title, material_type, file_url, url, created_at
FROM public.lesson_materials
ORDER BY created_at DESC
LIMIT 20;

-- 6) Verificar integridad
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN material_type = 'file' AND file_url IS NOT NULL AND url IS NULL THEN 1 END) as files_ok,
  COUNT(CASE WHEN material_type = 'link' AND url IS NOT NULL AND file_url IS NULL THEN 1 END) as links_ok,
  COUNT(CASE WHEN material_type NOT IN ('file', 'link') THEN 1 END) as invalid_types
FROM public.lesson_materials;
