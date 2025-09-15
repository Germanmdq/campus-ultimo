-- Limpiar TODOS los datos demo y de prueba
DELETE FROM lesson_progress;
DELETE FROM assignments;
DELETE FROM lesson_materials;
DELETE FROM lessons;
DELETE FROM enrollments;
DELETE FROM courses;
DELETE FROM programs;
DELETE FROM forum_post_replies;
DELETE FROM forum_post_likes;
DELETE FROM forum_post_files;
DELETE FROM forum_posts;
DELETE FROM messages;
DELETE FROM events;

-- Limpiar usuarios de prueba (mantener solo los necesarios)
-- Los profiles se limpiarán automáticamente cuando se eliminen los usuarios de auth