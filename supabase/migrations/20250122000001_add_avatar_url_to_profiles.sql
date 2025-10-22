-- Agregar campo avatar_url a la tabla profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Comentario para documentar el cambio
COMMENT ON COLUMN profiles.avatar_url IS 'URL de la foto de perfil del usuario';
