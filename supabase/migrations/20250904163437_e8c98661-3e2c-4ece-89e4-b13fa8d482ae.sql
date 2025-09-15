-- Limpiar todos los datos demo generados
DELETE FROM lesson_progress WHERE lesson_id IN (
  SELECT id FROM lessons WHERE description LIKE 'Bienvenida al curso%' 
  OR description LIKE 'Exploramos los principios%'
  OR description LIKE 'Ejercicios prácticos%'
);

DELETE FROM lessons WHERE description LIKE 'Bienvenida al curso%' 
OR description LIKE 'Exploramos los principios%'
OR description LIKE 'Ejercicios prácticos%';

-- Solo mantener datos reales importados y usuarios de prueba