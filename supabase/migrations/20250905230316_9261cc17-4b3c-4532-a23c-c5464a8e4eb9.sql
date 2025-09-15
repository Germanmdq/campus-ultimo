-- Drop default constraint first
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Create new enum with new values
CREATE TYPE app_role_new AS ENUM ('student', 'formador', 'voluntario', 'admin');

-- Update profiles table to use new enum  
ALTER TABLE profiles 
ALTER COLUMN role TYPE app_role_new USING 
CASE 
  WHEN role::text = 'teacher' THEN 'formador'::app_role_new
  WHEN role::text = 'student' THEN 'student'::app_role_new  
  WHEN role::text = 'admin' THEN 'admin'::app_role_new
  ELSE 'student'::app_role_new
END;

-- Set default for new enum
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'student'::app_role_new;

-- Drop old enum (this will cascade and remove all dependent policies)
DROP TYPE app_role CASCADE;

-- Rename new enum to original name
ALTER TYPE app_role_new RENAME TO app_role;

-- Recreate the has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Recreate all essential RLS policies
CREATE POLICY "Students can create own assignments" ON assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update own assignments" ON assignments FOR UPDATE USING ((auth.uid() = user_id) AND (status = 'submitted'::assignment_status));
CREATE POLICY "Students can view own assignments" ON assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Formadors and admins can update assignments" ON assignments FOR UPDATE USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Formadors and admins can view assignments" ON assignments FOR SELECT USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view published courses" ON courses FOR SELECT USING ((auth.role() = 'authenticated'::text) AND (published_at IS NOT NULL));
CREATE POLICY "Formadors and admins can manage courses" ON courses FOR ALL USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can create own enrollments" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can view own enrollments" ON enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Formadors and admins can manage enrollments" ON enrollments FOR ALL USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Formadors and admins can manage events" ON events FOR ALL USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view events based on visibility" ON events FOR SELECT USING ((auth.role() = 'authenticated'::text) AND ((visibility = 'all'::event_visibility) OR ((visibility = 'students'::event_visibility) AND has_role(auth.uid(), 'student'::app_role)) OR ((visibility = 'teachers'::event_visibility) AND (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))));

CREATE POLICY "System can create notifications" ON event_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON event_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON event_notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files to own posts" ON forum_post_files FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM forum_posts WHERE forum_posts.id = forum_post_files.post_id AND forum_posts.author_id = auth.uid()));
CREATE POLICY "Users can view post files" ON forum_post_files FOR SELECT USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can like posts" ON forum_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON forum_post_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view likes" ON forum_post_likes FOR SELECT USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create replies" ON forum_post_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own replies" ON forum_post_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can view replies" ON forum_post_replies FOR SELECT USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can create posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authenticated users can view posts" ON forum_posts FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Users can update own posts" ON forum_posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authenticated users can view forums" ON forums FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Formadors and admins can manage forums" ON forums FOR ALL USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view materials" ON lesson_materials FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Formadors and admins can manage materials" ON lesson_materials FOR ALL USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own progress" ON lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress records" ON lesson_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own progress" ON lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can update progress approval" ON lesson_progress FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Formadors and admins can view all progress" ON lesson_progress FOR SELECT USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view lessons" ON lessons FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Formadors and admins can manage lessons" ON lessons FOR ALL USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Formadors and admins can view profiles" ON profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'formador'::app_role) OR (auth.uid() = id));

CREATE POLICY "Authenticated users can view program courses" ON program_courses FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Formadors and admins can manage program courses" ON program_courses FOR ALL USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view published programs" ON programs FOR SELECT USING ((auth.role() = 'authenticated'::text) AND (published_at IS NOT NULL));
CREATE POLICY "Formadors and admins can manage programs" ON programs FOR ALL USING (has_role(auth.uid(), 'formador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));