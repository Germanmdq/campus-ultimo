-- Arreglar el problema de seguridad: establecer search_path en todas las funciones
CREATE OR REPLACE FUNCTION public.is_lesson_unlocked(
    _user_id uuid,
    _lesson_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.update_lesson_progress_timestamps()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;