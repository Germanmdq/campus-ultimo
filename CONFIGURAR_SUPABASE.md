# 🔧 Configuración de Supabase para Campus Último

## **1. Crear proyecto en Supabase:**

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Clic en "New Project"
4. Elige tu organización
5. Nombre del proyecto: `campus-ultimo`
6. Contraseña de la base de datos (guárdala)
7. Región: la más cercana a ti
8. Clic en "Create new project"

## **2. Obtener credenciales:**

1. En tu proyecto, ve a **Settings** → **API**
2. Copia estos valores:
   - **Project URL** (ejemplo: `https://tu-proyecto.supabase.co`)
   - **Project API Key (anon public)** (ejemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## **3. Actualizar archivo de configuración:**

Reemplaza el contenido de `/src/integrations/supabase/client.ts` con:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// REEMPLAZA ESTOS VALORES CON TUS CREDENCIALES
const SUPABASE_URL = "TU_PROJECT_URL_AQUI";
const SUPABASE_PUBLISHABLE_KEY = "TU_API_KEY_AQUI";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

## **4. Crear tablas en Supabase:**

Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
-- 1. Crear tabla de foros
CREATE TABLE IF NOT EXISTS forums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de posts del foro
CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    forum_id UUID REFERENCES forums(id) ON DELETE CASCADE
);

-- 3. Crear tabla de respuestas
CREATE TABLE IF NOT EXISTS forum_post_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE
);

-- 4. Crear tabla de archivos de posts
CREATE TABLE IF NOT EXISTS forum_post_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE
);

-- 5. Crear tabla de archivos de respuestas
CREATE TABLE IF NOT EXISTS forum_reply_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reply_id UUID REFERENCES forum_post_replies(id) ON DELETE CASCADE
);

-- 6. Crear tabla de likes
CREATE TABLE IF NOT EXISTS forum_post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- 7. Crear tabla de perfiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role TEXT DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_forum_id ON forum_posts(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_replies_author_id ON forum_post_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_replies_post_id ON forum_post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_files_post_id ON forum_post_files(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_reply_files_reply_id ON forum_reply_files(reply_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_user_id ON forum_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_post_id ON forum_post_likes(post_id);
```

## **5. Configurar RLS (Row Level Security):**

Ejecuta este SQL en el **SQL Editor**:

```sql
-- Habilitar RLS
ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reply_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para forums
CREATE POLICY "Everyone can view forums" ON forums FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create forums" ON forums FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own forums" ON forums FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own forums" ON forums FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para forum_posts
CREATE POLICY "Everyone can view forum posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());
CREATE POLICY "Users can update own posts" ON forum_posts FOR UPDATE USING (auth.uid() IS NOT NULL AND author_id = auth.uid());
CREATE POLICY "Users can delete own posts" ON forum_posts FOR DELETE USING (auth.uid() IS NOT NULL AND author_id = auth.uid());

-- Políticas para forum_post_replies
CREATE POLICY "Everyone can view forum replies" ON forum_post_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create replies" ON forum_post_replies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());
CREATE POLICY "Users can update own replies" ON forum_post_replies FOR UPDATE USING (auth.uid() IS NOT NULL AND author_id = auth.uid());
CREATE POLICY "Users can delete own replies" ON forum_post_replies FOR DELETE USING (auth.uid() IS NOT NULL AND author_id = auth.uid());

-- Políticas para forum_post_files
CREATE POLICY "Everyone can view post files" ON forum_post_files FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload post files" ON forum_post_files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own post files" ON forum_post_files FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para forum_reply_files
CREATE POLICY "Everyone can view reply files" ON forum_reply_files FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload reply files" ON forum_reply_files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own reply files" ON forum_reply_files FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para forum_post_likes
CREATE POLICY "Everyone can view likes" ON forum_post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like posts" ON forum_post_likes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "Users can unlike posts" ON forum_post_likes FOR DELETE USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Políticas para profiles
CREATE POLICY "Everyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can create own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
```

## **6. Configurar Storage:**

1. Ve a **Storage** en tu proyecto de Supabase
2. Clic en "Create a new bucket"
3. Nombre: `forum-files`
4. Público: ✅ **Sí**
5. Clic en "Create bucket"

## **7. Configurar políticas de Storage:**

Ejecuta este SQL en el **SQL Editor**:

```sql
-- Política para storage
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'forum-files');
CREATE POLICY "Authenticated users can upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'forum-files' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id = 'forum-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'forum-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## **8. Verificar configuración:**

1. Reinicia tu aplicación
2. Ve a la página del foro
3. Intenta crear un post
4. Verifica que no hay errores en la consola

## **9. Si hay problemas:**

- Revisa la consola del navegador para errores
- Verifica que las credenciales sean correctas
- Asegúrate de que todas las tablas se crearon
- Verifica que las políticas RLS estén activas

---

**¿Necesitas ayuda con algún paso específico?** 🤔
