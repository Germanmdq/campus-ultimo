-- Verificar materiales de la lección "11" (más reciente)
SELECT id, title, material_type, file_url, url, created_at
FROM public.lesson_materials
WHERE lesson_id = 'db37f5bd-4581-42d2-bea7-57f281e68ad4'
ORDER BY created_at DESC
LIMIT 10;
