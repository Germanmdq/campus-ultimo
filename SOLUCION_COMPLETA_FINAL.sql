-- ===================================================
-- SOLUCIÓN COMPLETA: Arreglar todas las tablas y problemas
-- ===================================================

-- 1. Deshabilitar RLS en todas las tablas problemáticas
ALTER TABLE public.lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials DISABLE ROW LEVEL SECURITY;

-- 2. Agregar columna material_type a lesson_materials
ALTER TABLE public.lesson_materials 
ADD COLUMN IF NOT EXISTS material_type text;

-- 3. Actualizar materiales existentes
UPDATE public.lesson_materials 
SET material_type = CASE 
  WHEN file_url IS NOT NULL AND file_url != '' THEN 'file'
  WHEN url IS NOT NULL AND url != '' THEN 'link'
  ELSE 'file'
END
WHERE material_type IS NULL;

-- 4. Establecer valor por defecto para material_type
ALTER TABLE public.lesson_materials 
ALTER COLUMN material_type SET DEFAULT 'file';

-- 5. Crear bucket materials para archivos
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Configurar políticas para el bucket materials (si no existen)
DO $$ 
BEGIN
    -- Crear políticas solo si no existen
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'materials_select_policy') THEN
        CREATE POLICY "materials_select_policy" ON storage.objects
        FOR SELECT USING (bucket_id = 'materials');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'materials_insert_policy') THEN
        CREATE POLICY "materials_insert_policy" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'materials');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'materials_update_policy') THEN
        CREATE POLICY "materials_update_policy" ON storage.objects
        FOR UPDATE USING (bucket_id = 'materials');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'materials_delete_policy') THEN
        CREATE POLICY "materials_delete_policy" ON storage.objects
        FOR DELETE USING (bucket_id = 'materials');
    END IF;
END $$;

-- 7. Verificar que todo está correcto
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN (
  'lessons', 'lesson_courses', 'assignments', 'courses', 'programs',
  'course_enrollments', 'enrollments', 'profiles', 'lesson_progress', 'lesson_materials'
)
AND schemaname = 'public'
ORDER BY tablename;
