-- ===================================================
-- ARREGLAR COLUMNA STATUS EN ASSIGNMENTS
-- ===================================================
-- Este script agrega la columna status a la tabla assignments

-- 1. Agregar columna status si no existe
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'submitted';

-- 2. Crear enum para assignment_status si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
        CREATE TYPE assignment_status AS ENUM ('submitted', 'reviewing', 'approved', 'rejected');
    END IF;
END $$;

-- 3. Cambiar el tipo de la columna a enum (opcional)
-- ALTER TABLE public.assignments 
-- ALTER COLUMN status TYPE assignment_status USING status::assignment_status;

-- 4. Verificar que la columna existe
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'assignments' 
AND table_schema = 'public'
AND column_name = 'status';

-- 5. Verificar RLS en assignments
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'assignments'
AND schemaname = 'public';
