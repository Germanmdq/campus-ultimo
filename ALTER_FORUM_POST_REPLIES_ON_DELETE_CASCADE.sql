-- ALTER_FORUM_POST_REPLIES_ON_DELETE_CASCADE.sql
-- Fecha: 2025-10-08
-- Propósito: Cambiar la FK de forum_post_replies para que borre en cascada cuando se elimina un post.
-- Instrucciones: Ejecutar en el SQL editor de Supabase o mediante psql/cli con un rol que tenga permisos para alterar constraints.

-- 1) Cambia la constraint de forum_post_replies.post_id para que use ON DELETE CASCADE
ALTER TABLE public.forum_post_replies
DROP CONSTRAINT IF EXISTS forum_post_replies_post_id_fkey,
ADD CONSTRAINT forum_post_replies_post_id_fkey
FOREIGN KEY (post_id)
REFERENCES public.forum_posts(id)
ON DELETE CASCADE;

-- NOTA IMPORTANTE:
-- Si existen otras tablas que referencian forum_post_replies (por ejemplo forum_reply_files
-- que guardan metadata de archivos por reply_id), sería recomendable también añadir ON DELETE CASCADE
-- sobre esa relación para evitar filas huérfanas.
-- Ejemplo recomendado adicional (opcional):
-- ALTER TABLE public.forum_reply_files
-- DROP CONSTRAINT IF EXISTS forum_reply_files_reply_id_fkey,
-- ADD CONSTRAINT forum_reply_files_reply_id_fkey
-- FOREIGN KEY (reply_id)
-- REFERENCES public.forum_post_replies(id)
-- ON DELETE CASCADE;

-- Sugerencia de verificación después de aplicar:
-- 1) Crear un post de prueba con replies y archivos asociados.
-- 2) Borrar el post desde el SQL editor o la app.
-- 3) Comprobar que las filas en forum_post_replies han sido eliminadas automáticamente.
-- 4) Comprobar que no hay filas huérfanas en forum_reply_files (si se añadió la segunda constraint
--    con ON DELETE CASCADE también deberán borrarse).

-- BACKUP: Antes de ejecutar en producción, hacer un dump o backup de las tablas afectadas.

-- Fin del archivo
