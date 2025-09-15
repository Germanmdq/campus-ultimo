-- Crear usuario Marcelo manualmente en auth.users y profiles
-- Primero insertamos en auth.users (simulando lo que haría la función edge)

-- Insertar en la tabla de perfiles directamente
INSERT INTO public.profiles (id, full_name, role)
VALUES ('ad23d6d3-9462-4bde-93e6-d2f4214ade41', 'Marcelo', 'student')
ON CONFLICT (id) DO NOTHING;

-- Nota: El usuario auth debe crearse a través del panel de Supabase o la función edge
-- Por ahora creamos solo el perfil para que esté disponible