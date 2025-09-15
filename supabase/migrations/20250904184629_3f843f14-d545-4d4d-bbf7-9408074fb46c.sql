-- Eliminar lecciones demo que pueden haber quedado
DELETE FROM lessons 
WHERE title ILIKE '%demo%' 
   OR title ILIKE '%ejemplo%'
   OR title ILIKE '%prueba%'
   OR description ILIKE '%demo%'
   OR description ILIKE '%ejemplo%';

-- Limpiar cursos sin título real
DELETE FROM courses 
WHERE title ILIKE '%demo%' 
   OR title ILIKE '%ejemplo%'
   OR title ILIKE '%prueba%'
   OR title = 'Untitled Course'
   OR title IS NULL;

-- Limpiar programas sin título real  
DELETE FROM programs 
WHERE title ILIKE '%demo%' 
   OR title ILIKE '%ejemplo%'
   OR title ILIKE '%prueba%'
   OR title = 'Untitled Program'
   OR title IS NULL;