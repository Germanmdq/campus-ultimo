-- ===================================================
-- ARREGLAR MATERIAL_TYPE EN LESSON_MATERIALS
-- ===================================================
-- Este script agrega la columna material_type si no existe
-- y deshabilita RLS en lesson_materials

-- 1. Agregar columna material_type si no existe
ALTER TABLE public.lesson_materials 
ADD COLUMN IF NOT EXISTS material_type text;

-- 2. Deshabilitar RLS en lesson_materials
ALTER TABLE public.lesson_materials DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que la columna existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lesson_materials' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'lesson_materials'
AND schemaname = 'public';
