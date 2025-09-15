-- PUBLICAR CONTENIDO PARA QUE SEA VISIBLE A ESTUDIANTES
UPDATE programs SET published_at = NOW() WHERE published_at IS NULL;
UPDATE courses SET published_at = NOW() WHERE published_at IS NULL;