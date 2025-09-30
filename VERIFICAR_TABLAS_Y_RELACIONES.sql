-- 🔍 VERIFICAR TODAS LAS TABLAS Y RELACIONES EXISTENTES
-- Ejecutar en Supabase SQL Editor para ver el estado actual

-- 1️⃣ LISTAR TODAS LAS TABLAS PÚBLICAS
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2️⃣ VER TODAS LAS RELACIONES (FOREIGN KEYS)
SELECT
    tc.table_name AS tabla_origen,
    kcu.column_name AS columna_origen,
    ccu.table_name AS tabla_destino,
    ccu.column_name AS columna_destino,
    tc.constraint_name AS nombre_constraint
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 3️⃣ VER TODOS LOS ENUMS (TIPOS PERSONALIZADOS)
SELECT 
    t.typname AS nombre_tipo,
    e.enumlabel AS valor_enum
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY t.typname, e.enumsortorder;

-- 4️⃣ VER POLÍTICAS RLS ACTIVAS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5️⃣ VER FUNCIONES Y TRIGGERS
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6️⃣ VER FUNCIONES DEFINIDAS
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 7️⃣ CONTAR REGISTROS POR TABLA
SELECT 
    schemaname,
    relname AS tablename,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS registros_actuales
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 8️⃣ VER ESTRUCTURA DETALLADA DE CADA TABLA
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 9️⃣ VER ÍNDICES
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 🔟 RESUMEN EJECUTIVO
SELECT 
    'TABLAS PÚBLICAS' as categoria,
    COUNT(*) as cantidad
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'RELACIONES FK' as categoria,
    COUNT(*) as cantidad
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
    AND table_schema = 'public'

UNION ALL

SELECT 
    'POLÍTICAS RLS' as categoria,
    COUNT(*) as cantidad
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'FUNCIONES' as categoria,
    COUNT(*) as cantidad
FROM information_schema.routines 
WHERE routine_schema = 'public'

UNION ALL

SELECT 
    'TRIGGERS' as categoria,
    COUNT(*) as cantidad
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
