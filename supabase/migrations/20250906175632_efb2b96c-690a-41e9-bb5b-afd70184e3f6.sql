-- Arreglar restricciones únicas para evitar duplicados
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_user_program_unique;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_user_program_unique UNIQUE (user_id, program_id);

-- Limpiar duplicados en enrollments si existen
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, program_id ORDER BY created_at DESC) as rn
  FROM enrollments
)
DELETE FROM enrollments 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Limpiar duplicados en course_enrollments si existen  
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, course_id ORDER BY created_at DESC) as rn
  FROM course_enrollments
)
DELETE FROM course_enrollments 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);