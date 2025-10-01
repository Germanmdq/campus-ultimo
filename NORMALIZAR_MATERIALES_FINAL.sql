-- ===================================================
-- NORMALIZAR MATERIALES - RUTA A (POR LECCIÓN)
-- ===================================================

-- Normaliza todo lo de la lección "prueba 5" (c872d7c5-b1cf-4891-b683-b3e675526eea):
-- si hay file_url => file (y anulamos url)
-- si hay url     => link (y anulamos file_url si querés)
UPDATE public.lesson_materials
SET
  material_type = CASE
    WHEN coalesce(file_url,'') <> '' THEN 'file'
    WHEN coalesce(url,'') <> '' THEN 'link'
    ELSE 'file'  -- default para materiales sin datos claros
  END,
  url = CASE WHEN coalesce(file_url,'') <> '' THEN NULL ELSE url END
WHERE lesson_id = 'c872d7c5-b1cf-4891-b683-b3e675526eea'::uuid;

-- Normaliza también la lección "11" (db37f5bd-4581-42d2-bea7-57f281e68ad4):
UPDATE public.lesson_materials
SET
  material_type = CASE
    WHEN coalesce(file_url,'') <> '' THEN 'file'
    WHEN coalesce(url,'') <> '' THEN 'link'
    ELSE 'file'
  END,
  url = CASE WHEN coalesce(file_url,'') <> '' THEN NULL ELSE url END
WHERE lesson_id = 'db37f5bd-4581-42d2-bea7-57f281e68ad4'::uuid;

-- Normaliza también la lección "10" (d819deb0-094c-41ce-8eb3-c88c6d7e096f):
UPDATE public.lesson_materials
SET
  material_type = CASE
    WHEN coalesce(file_url,'') <> '' THEN 'file'
    WHEN coalesce(url,'') <> '' THEN 'link'
    ELSE 'file'
  END,
  url = CASE WHEN coalesce(file_url,'') <> '' THEN NULL ELSE url END
WHERE lesson_id = 'd819deb0-094c-41ce-8eb3-c88c6d7e096f'::uuid;

-- Verificación de datos - lección "prueba 5":
SELECT id, title, material_type, file_url, url
FROM public.lesson_materials
WHERE lesson_id = 'c872d7c5-b1cf-4891-b683-b3e675526eea'::uuid
ORDER BY created_at DESC
LIMIT 10;

-- Verificación de datos - lección "11":
SELECT id, title, material_type, file_url, url
FROM public.lesson_materials
WHERE lesson_id = 'db37f5bd-4581-42d2-bea7-57f281e68ad4'::uuid
ORDER BY created_at DESC
LIMIT 10;
