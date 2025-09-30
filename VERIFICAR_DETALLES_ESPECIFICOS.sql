-- 🔍 VERIFICAR DETALLES ESPECÍFICOS DE LA BASE DE DATOS
-- Ejecutar en Supabase SQL Editor para ver qué tienes exactamente

-- 1️⃣ VER TODAS LAS TABLAS CON SUS DETALLES
SELECT 
    t.table_name,
    t.table_type,
    obj_description(c.oid) as descripcion,
    COUNT(col.column_name) as total_columnas
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
LEFT JOIN information_schema.columns col ON col.table_name = t.table_name
WHERE t.table_schema = 'public'
GROUP BY t.table_name, t.table_type, c.oid
ORDER BY t.table_name;

-- 2️⃣ VER TODAS LAS FUNCIONES CON SUS DETALLES
SELECT 
    routine_name as nombre_funcion,
    routine_type as tipo,
    data_type as tipo_retorno,
    LEFT(routine_definition, 100) as definicion_inicio
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 3️⃣ VER TODOS LOS TRIGGERS CON SUS DETALLES
SELECT 
    trigger_name as nombre_trigger,
    event_object_table as tabla,
    event_manipulation as evento,
    action_timing as momento,
    action_statement as accion
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 4️⃣ VER POLÍTICAS RLS POR TABLA
SELECT 
    tablename as tabla,
    COUNT(*) as total_politicas,
    STRING_AGG(policyname, ', ') as nombres_politicas
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 5️⃣ VER RELACIONES DETALLADAS
SELECT
    tc.table_name AS tabla_origen,
    kcu.column_name AS columna_origen,
    ccu.table_name AS tabla_destino,
    ccu.column_name AS columna_destino,
    tc.constraint_name AS constraint
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 6️⃣ VER ENUMS Y SUS VALORES
SELECT 
    t.typname AS tipo_enum,
    STRING_AGG(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS valores_posibles
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;

-- 7️⃣ VER TABLAS CON MÁS DATOS
SELECT 
    schemaname,
    relname AS tabla,
    n_live_tup AS registros_actuales,
    n_tup_ins AS total_inserts,
    n_tup_upd AS total_updates,
    n_tup_del AS total_deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
    AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- 8️⃣ VER ESTRUCTURA DE TABLAS CLAVE
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'courses', 'lessons', 'programs', 'assignments', 'forum_posts', 'forum_post_replies')
ORDER BY table_name, ordinal_position;

-- 9️⃣ VER SI HAY DATOS HUÉRFANOS
SELECT 
    'profiles sin usuario' as problema,
    COUNT(*) as cantidad
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT 
    'assignments sin profile' as problema,
    COUNT(*) as cantidad
FROM assignments a
LEFT JOIN profiles p ON a.user_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
    'forum_posts sin autor' as problema,
    COUNT(*) as cantidad
FROM forum_posts fp
LEFT JOIN profiles p ON fp.author_id = p.id
WHERE p.id IS NULL;

-- 🔟 RESUMEN DE ESTADO
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM profiles WHERE role = 'admin') THEN '✅ Hay administradores'
        ELSE '❌ No hay administradores'
    END as estado_admin,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM programs) THEN '✅ Hay programas'
        ELSE '❌ No hay programas'
    END as estado_programas,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM courses) THEN '✅ Hay cursos'
        ELSE '❌ No hay cursos'
    END as estado_cursos,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM forum_posts) THEN '✅ Hay posts en foro'
        ELSE '❌ No hay posts en foro'
    END as estado_foro;
