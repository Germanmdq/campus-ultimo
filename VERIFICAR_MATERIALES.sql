-- ===================================================
-- VERIFICAR MATERIALES EN LA BASE DE DATOS
-- ===================================================

-- 1. Ver todos los materiales con sus datos
SELECT 
  id, 
  title, 
  material_type, 
  file_url, 
  url,
  created_at,
  CASE 
    WHEN file_url IS NOT NULL AND file_url != '' THEN 'file'
    WHEN url IS NOT NULL AND url != '' THEN 'link'
    ELSE 'unknown'
  END as detected_type
FROM public.lesson_materials 
ORDER BY created_at DESC;

-- 2. Contar materiales por tipo
SELECT 
  material_type,
  COUNT(*) as cantidad
FROM public.lesson_materials 
GROUP BY material_type;

-- 3. Ver materiales que tienen file_url (deberían ser archivos)
SELECT 
  id, 
  title, 
  material_type, 
  file_url,
  CASE 
    WHEN file_url IS NOT NULL AND file_url != '' THEN 'file'
    ELSE 'unknown'
  END as detected_type
FROM public.lesson_materials 
WHERE file_url IS NOT NULL AND file_url != '';

-- 4. Ver materiales que tienen url (deberían ser enlaces)
SELECT 
  id, 
  title, 
  material_type, 
  url,
  CASE 
    WHEN url IS NOT NULL AND url != '' THEN 'link'
    ELSE 'unknown'
  END as detected_type
FROM public.lesson_materials 
WHERE url IS NOT NULL AND url != '';

-- 5. Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'lesson_materials' 
AND table_schema = 'public'
ORDER BY ordinal_position;
