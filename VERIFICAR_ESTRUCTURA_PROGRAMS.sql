-- ===================================================
-- VERIFICAR ESTRUCTURA DE LA TABLA PROGRAMS
-- ===================================================

-- Ver estructura de la tabla programs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'programs' 
ORDER BY ordinal_position;

-- Ver algunos registros de programs
SELECT * FROM programs LIMIT 3;

-- Ver estructura de la tabla courses
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'courses' 
ORDER BY ordinal_position;

-- Ver algunos registros de courses
SELECT * FROM courses LIMIT 3;
