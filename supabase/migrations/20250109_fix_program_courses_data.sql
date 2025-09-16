-- Migrar datos existentes de courses.program_id a program_courses
-- Esto asegura que los cursos existentes aparezcan en los programas

INSERT INTO public.program_courses (program_id, course_id, sort_order)
SELECT 
    program_id, 
    id as course_id, 
    sort_order
FROM public.courses 
WHERE program_id IS NOT NULL
ON CONFLICT (program_id, course_id) DO NOTHING;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_program_courses_program_id ON public.program_courses(program_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_course_id ON public.program_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_sort_order ON public.program_courses(program_id, sort_order);

-- Crear función para sincronizar automáticamente cuando se crea un curso
CREATE OR REPLACE FUNCTION public.sync_course_to_program()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Si el curso tiene program_id, asegurar que esté en program_courses
    IF NEW.program_id IS NOT NULL THEN
        INSERT INTO public.program_courses (program_id, course_id, sort_order)
        VALUES (NEW.program_id, NEW.id, NEW.sort_order)
        ON CONFLICT (program_id, course_id) 
        DO UPDATE SET sort_order = NEW.sort_order;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS trg_sync_course_to_program ON public.courses;
CREATE TRIGGER trg_sync_course_to_program
    AFTER INSERT OR UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_course_to_program();
