-- Script para dar TODOS los permisos al administrador
-- Ejecutar en la consola SQL de Supabase

-- 1. Verificar usuario admin actual
SELECT 
    u.email,
    p.role,
    p.full_name,
    'Admin actual' as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'germangonzalezmdq@gmail.com';

-- 2. Asegurar que sea admin
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'germangonzalezmdq@gmail.com'
);

-- 3. POLÍTICAS RLS PARA PROFILES - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with profiles" ON profiles;
CREATE POLICY "Admins can do everything with profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 4. POLÍTICAS RLS PARA FORUMS - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with forums" ON forums;
CREATE POLICY "Admins can do everything with forums" ON forums
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 5. POLÍTICAS RLS PARA FORUM_POSTS - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with forum_posts" ON forum_posts;
CREATE POLICY "Admins can do everything with forum_posts" ON forum_posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 6. POLÍTICAS RLS PARA FORUM_POST_REPLIES - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with forum_post_replies" ON forum_post_replies;
CREATE POLICY "Admins can do everything with forum_post_replies" ON forum_post_replies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 7. POLÍTICAS RLS PARA FORUM_NESTED_REPLIES - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with forum_nested_replies" ON forum_nested_replies;
CREATE POLICY "Admins can do everything with forum_nested_replies" ON forum_nested_replies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 8. POLÍTICAS RLS PARA FORUM_POST_FILES - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with forum_post_files" ON forum_post_files;
CREATE POLICY "Admins can do everything with forum_post_files" ON forum_post_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 9. POLÍTICAS RLS PARA FORUM_REPLY_FILES - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with forum_reply_files" ON forum_reply_files;
CREATE POLICY "Admins can do everything with forum_reply_files" ON forum_reply_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 10. POLÍTICAS RLS PARA FORUM_POST_LIKES - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with forum_post_likes" ON forum_post_likes;
CREATE POLICY "Admins can do everything with forum_post_likes" ON forum_post_likes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 11. POLÍTICAS RLS PARA PROGRAMS - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with programs" ON programs;
CREATE POLICY "Admins can do everything with programs" ON programs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 12. POLÍTICAS RLS PARA COURSES - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with courses" ON courses;
CREATE POLICY "Admins can do everything with courses" ON courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 13. POLÍTICAS RLS PARA LESSONS - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with lessons" ON lessons;
CREATE POLICY "Admins can do everything with lessons" ON lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 14. POLÍTICAS RLS PARA ASSIGNMENTS - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with assignments" ON assignments;
CREATE POLICY "Admins can do everything with assignments" ON assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 15. POLÍTICAS RLS PARA EVENTS - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with events" ON events;
CREATE POLICY "Admins can do everything with events" ON events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 16. POLÍTICAS RLS PARA MESSAGES - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with messages" ON messages;
CREATE POLICY "Admins can do everything with messages" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 17. POLÍTICAS RLS PARA ENROLLMENTS - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with enrollments" ON enrollments;
CREATE POLICY "Admins can do everything with enrollments" ON enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 18. POLÍTICAS RLS PARA LESSON_PROGRESS - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with lesson_progress" ON lesson_progress;
CREATE POLICY "Admins can do everything with lesson_progress" ON lesson_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 19. POLÍTICAS RLS PARA EVENT_NOTIFICATIONS - Admin puede hacer TODO
DROP POLICY IF EXISTS "Admins can do everything with event_notifications" ON event_notifications;
CREATE POLICY "Admins can do everything with event_notifications" ON event_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 20. Verificar que el admin tenga todos los permisos
SELECT 
    u.email,
    p.role,
    p.full_name,
    'Admin con permisos completos' as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'germangonzalezmdq@gmail.com';

-- 21. Mostrar resumen de políticas creadas
SELECT 
    schemaname,
    tablename,
    policyname,
    'Política creada' as status
FROM pg_policies 
WHERE policyname LIKE '%Admins can do everything%'
ORDER BY tablename;
