-- EJECUTAR ESTE SQL EN EL PANEL DE SUPABASE
-- Add submission URL field for lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS submission_url text;

-- Verificar que se agregó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name IN ('approval_form_url', 'submission_url');
