-- Crear usuarios de prueba para cada rol

-- Insertar usuarios directamente en auth.users (esto simula el registro)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES 
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'estudiante@test.com',
    '$2a$10$X.R6cUaAyBz7ACnmqZqWf.yDfPkc5MnCNXKUULTvY1X1z1K1yYmFK', -- password: test123
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ana García"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'profesor@test.com',
    '$2a$10$X.R6cUaAyBz7ACnmqZqWf.yDfPkc5MnCNXKUULTvY1X1z1K1yYmFK', -- password: test123
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Carlos Mendoza"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@test.com',
    '$2a$10$X.R6cUaAyBz7ACnmqZqWf.yDfPkc5MnCNXKUULTvY1X1z1K1yYmFK', -- password: test123
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"María Rodríguez"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Actualizar los perfiles que se crearon automáticamente con el trigger
DO $$
DECLARE
    student_id UUID;
    teacher_id UUID;
    admin_id UUID;
    program_id UUID;
    lesson1_id UUID;
    lesson2_id UUID;
BEGIN
    -- Obtener los IDs de los usuarios
    SELECT id INTO student_id FROM auth.users WHERE email = 'estudiante@test.com';
    SELECT id INTO teacher_id FROM auth.users WHERE email = 'profesor@test.com';
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@test.com';
    SELECT id INTO program_id FROM public.programs WHERE slug = 'geometria-sagrada-nivel-1';
    
    -- Actualizar los roles en los perfiles
    UPDATE public.profiles SET role = 'student', full_name = 'Ana García' WHERE id = student_id;
    UPDATE public.profiles SET role = 'teacher', full_name = 'Carlos Mendoza' WHERE id = teacher_id;
    UPDATE public.profiles SET role = 'admin', full_name = 'María Rodríguez' WHERE id = admin_id;
    
    -- Inscribir al estudiante en el programa
    INSERT INTO public.enrollments (user_id, program_id, status, progress_percent)
    VALUES (student_id, program_id, 'active', 35);
    
    -- Obtener IDs de las lecciones
    SELECT id INTO lesson1_id FROM public.lessons WHERE slug = 'bienvenida-geometria-sagrada';
    SELECT id INTO lesson2_id FROM public.lessons WHERE slug = 'numeros-y-formas';
    
    -- Crear progreso del estudiante
    INSERT INTO public.lesson_progress (user_id, lesson_id, watched_seconds, completed, approved)
    VALUES 
    (student_id, lesson1_id, 1200, true, true), -- Lección 1 completada
    (student_id, lesson2_id, 800, true, false); -- Lección 2 completada pero no aprobada
    
    -- Crear una entrega pendiente de aprobación
    INSERT INTO public.assignments (user_id, lesson_id, text_answer, status)
    VALUES (student_id, lesson2_id, 'He encontrado ejemplos de la proporción áurea en: 1) Los pétalos de una flor de girasol, 2) La concha de un nautilus, 3) Las hojas de una planta suculenta. En cada caso, se puede observar cómo la naturaleza utiliza esta proporción matemática para crear formas armoniosas y eficientes.', 'reviewing');
    
END $$;