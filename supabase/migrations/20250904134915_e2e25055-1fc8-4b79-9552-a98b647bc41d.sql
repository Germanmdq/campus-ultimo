-- Create messages table for real-time messaging
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Create forum_posts table with file support
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  program_id UUID,
  category TEXT,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum_post_files table for attachments
CREATE TABLE public.forum_post_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum_post_likes table
CREATE TABLE public.forum_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create forum_post_replies table
CREATE TABLE public.forum_post_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all forum tables
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_replies ENABLE ROW LEVEL SECURITY;

-- Create policies for forum_posts
CREATE POLICY "Authenticated users can view posts" 
ON public.forum_posts 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create posts" 
ON public.forum_posts 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts" 
ON public.forum_posts 
FOR UPDATE 
USING (auth.uid() = author_id);

-- Create policies for forum_post_files
CREATE POLICY "Users can view post files" 
ON public.forum_post_files 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can upload files to own posts" 
ON public.forum_post_files 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.forum_posts 
    WHERE id = post_id AND author_id = auth.uid()
  )
);

-- Create policies for forum_post_likes
CREATE POLICY "Users can view likes" 
ON public.forum_post_likes 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can like posts" 
ON public.forum_post_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" 
ON public.forum_post_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for forum_post_replies
CREATE POLICY "Users can view replies" 
ON public.forum_post_replies 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create replies" 
ON public.forum_post_replies 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own replies" 
ON public.forum_post_replies 
FOR UPDATE 
USING (auth.uid() = author_id);

-- Create updated_at triggers
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_post_replies_updated_at
  BEFORE UPDATE ON public.forum_post_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();