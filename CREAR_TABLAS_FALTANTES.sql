-- CREAR TABLAS QUE FALTAN PARA QUE EL CÓDIGO FUNCIONE

-- 1. Tabla course_enrollments (que el código está intentando usar)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- 2. Tabla program_courses (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS public.program_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, course_id)
);

-- 3. Habilitar RLS en las nuevas tablas
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas permisivas
CREATE POLICY "course_enrollments_allow_all" ON course_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "program_courses_allow_all" ON program_courses FOR ALL USING (true) WITH CHECK (true);

-- 5. Mensaje de confirmación
SELECT 'Tablas faltantes creadas' as resultado;
