-- SOLO LO ESENCIAL - SIN TOCAR FUNCIONES EXISTENTES

-- 1. Agregar columna role si no existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- 2. Hacer admin al usuario
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'germangonzalezmdq@gmail.com');

-- 3. Verificar que funcionó
SELECT id, email, role FROM public.profiles WHERE email = 'germangonzalezmdq@gmail.com';

-- 4. Mensaje final
SELECT 'Listo' as resultado;
