-- 🔍 VERIFICAR ESTRUCTURA DE LA TABLA PROFILES
-- Ejecutar en Supabase SQL Editor

-- 1️⃣ Ver estructura de la tabla profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2️⃣ Ver datos actuales en profiles
SELECT * FROM public.profiles LIMIT 5;

-- 3️⃣ Ver si existe columna role
SELECT 
    column_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name = 'role';

-- 4️⃣ Ver todos los usuarios y sus perfiles
SELECT 
    u.id,
    u.email,
    p.*
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'germangonzalezmdq@gmail.com';
