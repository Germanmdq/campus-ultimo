-- Verificar materiales en la DB
SELECT 
  id, 
  title, 
  material_type, 
  file_url, 
  url,
  created_at
FROM lesson_materials 
ORDER BY created_at DESC 
LIMIT 5;
