-- Migración para soportar el flujo de LearnDash
-- 1. Actualizar la tabla lessons para soportar el orden correcto y requisitos
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prerequisite_lesson_id uuid REFERENCES public.lessons(id);

-- 2. Actualizar la tabla lesson_progress para incluir más estados
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- 3. Actualizar assignments para soportar mejor el flujo de aprobación
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS grade numeric(5,2),
ADD COLUMN IF NOT EXISTS max_grade numeric(5,2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 1;

-- 4. Crear tabla para relacionar cursos con programas (muchos a muchos)
CREATE TABLE IF NOT EXISTS public.program_courses (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(program_id, course_id)
);

-- Enable RLS on program_courses
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;

-- RLS policies for program_courses
CREATE POLICY "Authenticated users can view program courses"
ON public.program_courses FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers and admins can manage program courses"
ON public.program_courses FOR ALL
USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Crear función para verificar si una lección está desbloqueada
CREATE OR REPLACE FUNCTION public.is_lesson_unlocked(
    _user_id uuid,
    _lesson_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _prerequisite_id uuid;
    _has_assignment boolean;
    _assignment_approved boolean;
    _prerequisite_completed boolean;
BEGIN
    -- Obtener la lección prerequisito
    SELECT prerequisite_lesson_id INTO _prerequisite_id
    FROM lessons 
    WHERE id = _lesson_id;
    
    -- Si no hay prerequisito, está desbloqueada
    IF _prerequisite_id IS NULL THEN
        RETURN true;
    END IF;
    
    -- Verificar si el prerequisito está completado
    SELECT completed INTO _prerequisite_completed
    FROM lesson_progress
    WHERE user_id = _user_id AND lesson_id = _prerequisite_id;
    
    -- Si el prerequisito no está completado, no está desbloqueada
    IF _prerequisite_completed IS NOT TRUE THEN
        RETURN false;
    END IF;
    
    -- Verificar si el prerequisito tiene assignment
    SELECT has_assignment INTO _has_assignment
    FROM lessons
    WHERE id = _prerequisite_id;
    
    -- Si no tiene assignment, está desbloqueada
    IF _has_assignment IS NOT TRUE THEN
        RETURN true;
    END IF;
    
    -- Verificar si el assignment está aprobado
    SELECT EXISTS(
        SELECT 1 FROM assignments 
        WHERE user_id = _user_id 
        AND lesson_id = _prerequisite_id 
        AND status = 'approved'::assignment_status
    ) INTO _assignment_approved;
    
    RETURN _assignment_approved;
END;
$$;

-- 6. Crear función para obtener el progreso de un curso
CREATE OR REPLACE FUNCTION public.get_course_progress(
    _user_id uuid,
    _course_id uuid
) RETURNS TABLE (
    total_lessons integer,
    completed_lessons integer,
    progress_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH course_stats AS (
        SELECT 
            COUNT(l.id) as total,
            COUNT(CASE WHEN lp.completed = true THEN 1 END) as completed
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = _user_id
        WHERE l.course_id = _course_id
    )
    SELECT 
        total::integer,
        completed::integer,
        CASE 
            WHEN total = 0 THEN 0::numeric
            ELSE ROUND((completed::numeric / total::numeric) * 100, 2)
        END as progress_percent
    FROM course_stats;
END;
$$;

-- 7. Actualizar trigger para lesson_progress
CREATE OR REPLACE FUNCTION public.update_lesson_progress_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se marca como completada por primera vez
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        NEW.completed_at = now();
    END IF;
    
    -- Si se desmarca como completada
    IF NEW.completed = false AND OLD.completed = true THEN
        NEW.completed_at = NULL;
    END IF;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS update_lesson_progress_timestamps_trigger ON public.lesson_progress;
CREATE TRIGGER update_lesson_progress_timestamps_trigger
    BEFORE UPDATE ON public.lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lesson_progress_timestamps();

-- 8. Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_lessons_course_sort ON public.lessons(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_prerequisite ON public.lessons(prerequisite_lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_lesson_status ON public.assignments(user_id, lesson_id, status);
CREATE INDEX IF NOT EXISTS idx_program_courses_program_sort ON public.program_courses(program_id, sort_order);