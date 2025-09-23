# 🪣 CREAR BUCKET FORUM-FILES

## Opción 1: Supabase Dashboard (RÁPIDO)

1. Ve a **Supabase Dashboard** → Tu proyecto
2. Ve a **Storage** en el menú lateral
3. Click **"New bucket"**
4. Configuración:
   - **Name:** `forum-files`
   - **Public:** ✅ (marcado)
   - **File size limit:** `10 MB`
   - **Allowed MIME types:** 
     ```
     image/jpeg, image/jpg, image/png, image/webp, image/gif, image/bmp,
     application/pdf, text/plain, text/csv,
     application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document,
     application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
     application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation,
     video/mp4, video/avi, video/quicktime,
     audio/mpeg, audio/wav, audio/ogg
     ```
5. Click **"Create bucket"**

## Opción 2: SQL Editor (ALTERNATIVO)

Si prefieres usar SQL, ejecuta esto en **SQL Editor**:

```sql
-- Crear bucket forum-files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-files',
  'forum-files',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4', 'video/avi', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]::text[]
);

-- Crear políticas RLS
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'forum-files');

CREATE POLICY "Users can upload forum files" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'forum-files' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update forum files" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'forum-files' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete forum files" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'forum-files' 
  AND auth.role() = 'authenticated'
);
```

## ✅ Verificar

Después de crear el bucket, verifica que existe:
1. Ve a **Storage** → **Buckets**
2. Deberías ver `forum-files` en la lista
3. Prueba subir un archivo en el foro

## 🚨 Si sigue fallando

Si el bucket existe pero sigue dando error, puede ser un problema de permisos RLS. En ese caso, ejecuta el SQL de arriba para asegurar las políticas.
