-- Crear tabla para archivos de respuestas del foro
CREATE TABLE public.forum_reply_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.forum_reply_files ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para forum_reply_files
CREATE POLICY "Users can view reply files" 
ON public.forum_reply_files 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can upload files to replies" 
ON public.forum_reply_files 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.forum_post_replies 
    WHERE id = reply_id AND author_id = auth.uid()
  )
);

CREATE POLICY "Users can update own reply files" 
ON public.forum_reply_files 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.forum_post_replies 
    WHERE id = reply_id AND author_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own reply files" 
ON public.forum_reply_files 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.forum_post_replies 
    WHERE id = reply_id AND author_id = auth.uid()
  )
);

-- Agregar foreign key constraint
ALTER TABLE public.forum_reply_files 
ADD CONSTRAINT forum_reply_files_reply_id_fkey 
FOREIGN KEY (reply_id) 
REFERENCES public.forum_post_replies(id) 
ON DELETE CASCADE;
