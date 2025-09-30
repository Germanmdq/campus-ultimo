-- 🔑 HACER ADMINISTRADOR A germangonzalezmdq@gmail.com
-- Ejecutar en Supabase SQL Editor

-- 1️⃣ AGREGAR COLUMNA ROLE SI NO EXISTE
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- 2️⃣ Verificar usuario actual
SELECT 
    u.id,
    u.email,
    p.role,
    p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'germangonzalezmdq@gmail.com';

-- 3️⃣ Actualizar rol a administrador
UPDATE public.profiles 
SET 
    role = 'admin',
    updated_at = NOW()
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'germangonzalezmdq@gmail.com'
);

-- 3️⃣ Verificar cambio
SELECT 
    u.id,
    u.email,
    p.role,
    p.full_name,
    p.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'germangonzalezmdq@gmail.com';

-- 4️⃣ Mensaje de confirmación
SELECT '✅ Usuario germangonzalezmdq@gmail.com ahora es administrador' as resultado;