-- Crear tabla para relacionar lecciones con múltiples cursos
CREATE TABLE public.lesson_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, course_id)
);

-- Habilitar RLS
ALTER TABLE public.lesson_courses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view lesson courses" 
ON public.lesson_courses 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers and admins can manage lesson courses" 
ON public.lesson_courses 
FOR ALL 
USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Migrar datos existentes de lessons.course_id a lesson_courses
INSERT INTO public.lesson_courses (lesson_id, course_id)
SELECT id, course_id 
FROM public.lessons 
WHERE course_id IS NOT NULL;

-- Nota: No eliminamos course_id de lessons aún para mantener compatibilidad
-- El usuario puede decidir si quiere eliminar esa columna después