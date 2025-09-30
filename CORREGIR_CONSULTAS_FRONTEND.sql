-- CORREGIR CONSULTAS FRONTEND - SOLO POLÍTICAS RLS
-- Sin tocar funciones existentes

-- 1. Políticas permisivas para profiles
DROP POLICY IF EXISTS "profiles_allow_all" ON profiles;
CREATE POLICY "profiles_allow_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- 2. Políticas permisivas para programs  
DROP POLICY IF EXISTS "programs_allow_all" ON programs;
CREATE POLICY "programs_allow_all" ON programs FOR ALL USING (true) WITH CHECK (true);

-- 3. Políticas permisivas para courses
DROP POLICY IF EXISTS "courses_allow_all" ON courses;
CREATE POLICY "courses_allow_all" ON courses FOR ALL USING (true) WITH CHECK (true);

-- 4. Políticas permisivas para enrollments
DROP POLICY IF EXISTS "enrollments_allow_all" ON enrollments;
CREATE POLICY "enrollments_allow_all" ON enrollments FOR ALL USING (true) WITH CHECK (true);

-- 5. Políticas permisivas para assignments
DROP POLICY IF EXISTS "assignments_allow_all" ON assignments;
CREATE POLICY "assignments_allow_all" ON assignments FOR ALL USING (true) WITH CHECK (true);

-- 6. Políticas permisivas para forum_posts
DROP POLICY IF EXISTS "forum_posts_allow_all" ON forum_posts;
CREATE POLICY "forum_posts_allow_all" ON forum_posts FOR ALL USING (true) WITH CHECK (true);

-- 7. Políticas permisivas para forum_post_replies
DROP POLICY IF EXISTS "forum_post_replies_allow_all" ON forum_post_replies;
CREATE POLICY "forum_post_replies_allow_all" ON forum_post_replies FOR ALL USING (true) WITH CHECK (true);

-- 8. Políticas permisivas para forum_post_files
DROP POLICY IF EXISTS "forum_post_files_allow_all" ON forum_post_files;
CREATE POLICY "forum_post_files_allow_all" ON forum_post_files FOR ALL USING (true) WITH CHECK (true);

-- 9. Políticas permisivas para forum_post_likes
DROP POLICY IF EXISTS "forum_post_likes_allow_all" ON forum_post_likes;
CREATE POLICY "forum_post_likes_allow_all" ON forum_post_likes FOR ALL USING (true) WITH CHECK (true);

-- 10. Verificar que RLS esté habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;

-- 11. Mensaje final
SELECT 'Políticas RLS corregidas' as resultado;
