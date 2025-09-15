-- Create forums table
CREATE TABLE public.forums (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  program_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on forums table
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for forums
CREATE POLICY "Authenticated users can view forums" 
ON public.forums 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Teachers and admins can manage forums" 
ON public.forums 
FOR ALL 
USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add forum_id column to forum_posts table
ALTER TABLE public.forum_posts ADD COLUMN forum_id uuid;

-- Add trigger for forums updated_at
CREATE TRIGGER update_forums_updated_at
BEFORE UPDATE ON public.forums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();