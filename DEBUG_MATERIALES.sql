-- ===================================================
-- DEBUG: Ver exactamente qué datos tienen los materiales
-- ===================================================

-- Ver los materiales más recientes con todos sus campos
SELECT 
  id, 
  title, 
  material_type, 
  file_url, 
  url,
  created_at,
  -- Verificar si file_url tiene contenido
  CASE 
    WHEN file_url IS NOT NULL AND file_url != '' THEN 'TIENE_FILE_URL'
    ELSE 'NO_TIENE_FILE_URL'
  END as file_url_status,
  -- Verificar si url tiene contenido  
  CASE 
    WHEN url IS NOT NULL AND url != '' THEN 'TIENE_URL'
    ELSE 'NO_TIENE_URL'
  END as url_status
FROM public.lesson_materials 
ORDER BY created_at DESC
LIMIT 5;
