-- Agregar campo cover_image_url a la tabla forums
ALTER TABLE forums ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Comentario para documentar el cambio
COMMENT ON COLUMN forums.cover_image_url IS 'URL de la imagen de portada del foro (estilo Facebook)';
