-- VERIFICAR SI EXISTE LA TABLA FORUM_REPLY_FILES
-- Si no existe, la creamos

-- 1. Verificar si la tabla existe
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'forum_reply_files'
ORDER BY ordinal_position;

-- 2. Si no existe, crear la tabla
CREATE TABLE IF NOT EXISTS forum_reply_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reply_id UUID NOT NULL REFERENCES forum_post_replies(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_forum_reply_files_reply_id ON forum_reply_files(reply_id);

-- 4. Verificar que se creó correctamente
SELECT 'Tabla forum_reply_files creada/verificada correctamente' as mensaje;
