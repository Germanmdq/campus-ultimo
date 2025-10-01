-- 1. Obtener lesson_id real de las últimas lecciones
SELECT id, title, created_at
FROM public.lessons
ORDER BY created_at DESC
LIMIT 10;

-- 2. Una vez que tengas el lesson_id, úsalo aquí:
-- SELECT id, title, material_type, file_url, url, created_at
-- FROM public.lesson_materials
-- WHERE lesson_id = 'AQUI-PEGA-EL-UUID-REAL'
-- ORDER BY created_at DESC
-- LIMIT 10;
