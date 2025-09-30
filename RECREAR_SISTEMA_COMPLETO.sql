-- 🚀 RECREAR SISTEMA COMPLETO DE CAMPUS VIRTUAL
-- Incluye TODAS las tablas necesarias: perfiles, cursos, lecciones, foros, archivos, etc.

-- 1️⃣ CREAR ENUMS NECESARIOS (eliminar si existen primero)
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.enrollment_status CASCADE;
DROP TYPE IF EXISTS public.material_type CASCADE;
DROP TYPE IF EXISTS public.assignment_status CASCADE;
DROP TYPE IF EXISTS public.event_visibility CASCADE;

CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin', 'formador');
CREATE TYPE public.enrollment_status AS ENUM ('active', 'completed', 'canceled');
CREATE TYPE public.material_type AS ENUM ('file', 'link', 'video', 'image');
CREATE TYPE public.assignment_status AS ENUM ('submitted', 'reviewing', 'approved', 'rejected');
CREATE TYPE public.event_visibility AS ENUM ('all', 'students', 'teachers');

-- 2️⃣ TABLA PROFILES (PERFILES DE USUARIO)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    role app_role NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3️⃣ TABLA PROGRAMS (PROGRAMAS)
CREATE TABLE IF NOT EXISTS public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT,
    description TEXT,
    poster_2x3_url TEXT,
    wide_11x6_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ TABLA COURSES (CURSOS)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT,
    description TEXT,
    poster_2x3_url TEXT,
    wide_11x6_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5️⃣ TABLA LESSONS (LECCIONES)
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    video_url TEXT,
    duration_minutes INTEGER DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    has_materials BOOLEAN DEFAULT FALSE,
    requires_admin_approval BOOLEAN DEFAULT FALSE,
    has_assignment BOOLEAN DEFAULT FALSE,
    assignment_instructions TEXT,
    prerequisite_lesson_id UUID REFERENCES public.lessons(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6️⃣ TABLA LESSON_MATERIALS (MATERIALES DE LECCIONES)
CREATE TABLE IF NOT EXISTS public.lesson_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type material_type NOT NULL,
    url TEXT,
    file_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7️⃣ TABLA ENROLLMENTS (INSCRIPCIONES)
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    status enrollment_status DEFAULT 'active',
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, program_id)
);

-- 8️⃣ TABLA ASSIGNMENTS (ASIGNACIONES/INSCRIPCIONES A CURSOS)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status assignment_status DEFAULT 'submitted',
    grade NUMERIC(5,2),
    max_grade NUMERIC(5,2) DEFAULT 100,
    attempts INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- 9️⃣ TABLA LESSON_PROGRESS (PROGRESO DE LECCIONES)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- 🔟 TABLA FORUMS (FOROS)
CREATE TABLE IF NOT EXISTS public.forums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1️⃣1️⃣ TABLA FORUM_POSTS (POSTS DEL FORO)
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    category TEXT DEFAULT 'general',
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1️⃣2️⃣ TABLA FORUM_POST_REPLIES (RESPUESTAS A POSTS)
CREATE TABLE IF NOT EXISTS public.forum_post_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_reply_id UUID REFERENCES public.forum_post_replies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1️⃣3️⃣ TABLA FORUM_POST_FILES (ARCHIVOS DE POSTS)
CREATE TABLE IF NOT EXISTS public.forum_post_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1️⃣4️⃣ TABLA FORUM_REPLY_FILES (ARCHIVOS DE RESPUESTAS)
CREATE TABLE IF NOT EXISTS public.forum_reply_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID NOT NULL REFERENCES public.forum_post_replies(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1️⃣5️⃣ TABLA FORUM_POST_LIKES (LIKES DE POSTS)
CREATE TABLE IF NOT EXISTS public.forum_post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- 1️⃣6️⃣ TABLA MESSAGES (MENSAJES PRIVADOS)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1️⃣7️⃣ TABLA EVENTS (EVENTOS)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    visibility event_visibility DEFAULT 'all',
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1️⃣8️⃣ HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reply_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 1️⃣9️⃣ CREAR FUNCIÓN PARA MANEJAR NUEVOS USUARIOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2️⃣0️⃣ CREAR TRIGGER PARA NUEVOS USUARIOS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2️⃣1️⃣ CREAR FUNCIÓN PARA INSCRIBIRSE A CURSOS
CREATE OR REPLACE FUNCTION public.enroll_in_course(p_course_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM courses WHERE id = p_course_id) THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;
  
  INSERT INTO public.assignments (user_id, course_id, created_at)
  VALUES (auth.uid(), p_course_id, NOW())
  ON CONFLICT (user_id, course_id) DO NOTHING;
  
  RAISE NOTICE 'Usuario % inscrito en curso %', auth.uid(), p_course_id;
END;
$$;

-- 2️⃣2️⃣ CREAR FUNCIÓN PARA VERIFICAR SI LECCIÓN ESTÁ DESBLOQUEADA
CREATE OR REPLACE FUNCTION public.is_lesson_unlocked(
    _user_id UUID,
    _lesson_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _prerequisite_id UUID;
BEGIN
    SELECT prerequisite_lesson_id INTO _prerequisite_id
    FROM lessons 
    WHERE id = _lesson_id;
    
    IF _prerequisite_id IS NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM lesson_progress 
        WHERE user_id = _user_id 
        AND lesson_id = _prerequisite_id 
        AND completed = TRUE
    );
END;
$$;

-- 2️⃣3️⃣ CREAR POLÍTICAS RLS PERMISIVAS PARA TODAS LAS TABLAS
-- Profiles
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_all" ON profiles;

CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_all" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_all" ON profiles FOR UPDATE USING (true);
CREATE POLICY "profiles_delete_all" ON profiles FOR DELETE USING (true);

-- Programs
CREATE POLICY "programs_select_all" ON programs FOR SELECT USING (true);
CREATE POLICY "programs_insert_all" ON programs FOR INSERT WITH CHECK (true);
CREATE POLICY "programs_update_all" ON programs FOR UPDATE USING (true);
CREATE POLICY "programs_delete_all" ON programs FOR DELETE USING (true);

-- Courses
CREATE POLICY "courses_select_all" ON courses FOR SELECT USING (true);
CREATE POLICY "courses_insert_all" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "courses_update_all" ON courses FOR UPDATE USING (true);
CREATE POLICY "courses_delete_all" ON courses FOR DELETE USING (true);

-- Lessons
CREATE POLICY "lessons_select_all" ON lessons FOR SELECT USING (true);
CREATE POLICY "lessons_insert_all" ON lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "lessons_update_all" ON lessons FOR UPDATE USING (true);
CREATE POLICY "lessons_delete_all" ON lessons FOR DELETE USING (true);

-- Lesson Materials
CREATE POLICY "lesson_materials_select_all" ON lesson_materials FOR SELECT USING (true);
CREATE POLICY "lesson_materials_insert_all" ON lesson_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "lesson_materials_update_all" ON lesson_materials FOR UPDATE USING (true);
CREATE POLICY "lesson_materials_delete_all" ON lesson_materials FOR DELETE USING (true);

-- Enrollments
CREATE POLICY "enrollments_select_all" ON enrollments FOR SELECT USING (true);
CREATE POLICY "enrollments_insert_all" ON enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "enrollments_update_all" ON enrollments FOR UPDATE USING (true);
CREATE POLICY "enrollments_delete_all" ON enrollments FOR DELETE USING (true);

-- Assignments
CREATE POLICY "assignments_select_all" ON assignments FOR SELECT USING (true);
CREATE POLICY "assignments_insert_all" ON assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "assignments_update_all" ON assignments FOR UPDATE USING (true);
CREATE POLICY "assignments_delete_all" ON assignments FOR DELETE USING (true);

-- Lesson Progress
CREATE POLICY "lesson_progress_select_all" ON lesson_progress FOR SELECT USING (true);
CREATE POLICY "lesson_progress_insert_all" ON lesson_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "lesson_progress_update_all" ON lesson_progress FOR UPDATE USING (true);
CREATE POLICY "lesson_progress_delete_all" ON lesson_progress FOR DELETE USING (true);

-- Forums
CREATE POLICY "forums_select_all" ON forums FOR SELECT USING (true);
CREATE POLICY "forums_insert_all" ON forums FOR INSERT WITH CHECK (true);
CREATE POLICY "forums_update_all" ON forums FOR UPDATE USING (true);
CREATE POLICY "forums_delete_all" ON forums FOR DELETE USING (true);

-- Forum Posts
CREATE POLICY "forum_posts_select_all" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_insert_all" ON forum_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "forum_posts_update_all" ON forum_posts FOR UPDATE USING (true);
CREATE POLICY "forum_posts_delete_all" ON forum_posts FOR DELETE USING (true);

-- Forum Post Replies
CREATE POLICY "forum_post_replies_select_all" ON forum_post_replies FOR SELECT USING (true);
CREATE POLICY "forum_post_replies_insert_all" ON forum_post_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "forum_post_replies_update_all" ON forum_post_replies FOR UPDATE USING (true);
CREATE POLICY "forum_post_replies_delete_all" ON forum_post_replies FOR DELETE USING (true);

-- Forum Post Files
CREATE POLICY "forum_post_files_select_all" ON forum_post_files FOR SELECT USING (true);
CREATE POLICY "forum_post_files_insert_all" ON forum_post_files FOR INSERT WITH CHECK (true);
CREATE POLICY "forum_post_files_update_all" ON forum_post_files FOR UPDATE USING (true);
CREATE POLICY "forum_post_files_delete_all" ON forum_post_files FOR DELETE USING (true);

-- Forum Reply Files
CREATE POLICY "forum_reply_files_select_all" ON forum_reply_files FOR SELECT USING (true);
CREATE POLICY "forum_reply_files_insert_all" ON forum_reply_files FOR INSERT WITH CHECK (true);
CREATE POLICY "forum_reply_files_update_all" ON forum_reply_files FOR UPDATE USING (true);
CREATE POLICY "forum_reply_files_delete_all" ON forum_reply_files FOR DELETE USING (true);

-- Forum Post Likes
CREATE POLICY "forum_post_likes_select_all" ON forum_post_likes FOR SELECT USING (true);
CREATE POLICY "forum_post_likes_insert_all" ON forum_post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "forum_post_likes_update_all" ON forum_post_likes FOR UPDATE USING (true);
CREATE POLICY "forum_post_likes_delete_all" ON forum_post_likes FOR DELETE USING (true);

-- Messages
CREATE POLICY "messages_select_all" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_insert_all" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update_all" ON messages FOR UPDATE USING (true);
CREATE POLICY "messages_delete_all" ON messages FOR DELETE USING (true);

-- Events
CREATE POLICY "events_select_all" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert_all" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_update_all" ON events FOR UPDATE USING (true);
CREATE POLICY "events_delete_all" ON events FOR DELETE USING (true);

-- 2️⃣4️⃣ PERMITIR EJECUCIÓN DE FUNCIONES
GRANT EXECUTE ON FUNCTION public.enroll_in_course(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lesson_unlocked(UUID, UUID) TO authenticated;

-- 2️⃣5️⃣ MENSAJE DE CONFIRMACIÓN
SELECT '✅ Sistema completo de campus virtual recreado' as status;
SELECT '✅ Incluye: perfiles, cursos, lecciones, foros, archivos, mensajes, eventos' as funcionalidades;
SELECT '✅ Políticas RLS permisivas configuradas' as seguridad;
SELECT '✅ Funciones y triggers creados' as automatizacion;
