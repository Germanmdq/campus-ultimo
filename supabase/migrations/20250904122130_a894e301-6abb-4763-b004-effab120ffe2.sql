-- Limpiar usuarios de prueba anteriores
DELETE FROM public.assignments WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('estudiante@test.com', 'profesor@test.com', 'admin@test.com')
);

DELETE FROM public.lesson_progress WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('estudiante@test.com', 'profesor@test.com', 'admin@test.com')
);

DELETE FROM public.enrollments WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('estudiante@test.com', 'profesor@test.com', 'admin@test.com')
);

DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('estudiante@test.com', 'profesor@test.com', 'admin@test.com')
);

DELETE FROM auth.users WHERE email IN ('estudiante@test.com', 'profesor@test.com', 'admin@test.com');