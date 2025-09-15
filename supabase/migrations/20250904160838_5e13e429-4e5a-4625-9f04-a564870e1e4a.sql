-- Insertar lecciones de ejemplo para los cursos existentes
INSERT INTO lessons (title, description, slug, course_id, video_url, sort_order, duration_minutes) 
SELECT 
  'Lección 1: Introducción a ' || c.title,
  'Bienvenida al curso y conceptos fundamentales',
  'leccion-1-' || c.slug,
  c.id,
  'https://player.vimeo.com/video/123456789',
  1,
  30
FROM courses c 
WHERE NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = c.id AND l.sort_order = 1);

INSERT INTO lessons (title, description, slug, course_id, video_url, sort_order, duration_minutes) 
SELECT 
  'Lección 2: Principios Básicos',
  'Exploramos los principios fundamentales y su aplicación práctica',
  'leccion-2-' || c.slug,
  c.id,
  'https://player.vimeo.com/video/123456790',
  2,
  45
FROM courses c 
WHERE NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = c.id AND l.sort_order = 2);

INSERT INTO lessons (title, description, slug, course_id, video_url, sort_order, duration_minutes) 
SELECT 
  'Lección 3: Práctica y Aplicación',
  'Ejercicios prácticos y aplicación de los conceptos aprendidos',
  'leccion-3-' || c.slug,
  c.id,
  'https://player.vimeo.com/video/123456791',
  3,
  60
FROM courses c 
WHERE NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = c.id AND l.sort_order = 3);

-- Crear progreso de ejemplo para usuarios existentes
INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at, watched_seconds)
SELECT 
  p.id as user_id,
  l.id as lesson_id,
  CASE 
    WHEN l.sort_order = 1 THEN true
    WHEN l.sort_order = 2 THEN RANDOM() > 0.5
    ELSE false
  END as completed,
  CASE 
    WHEN l.sort_order = 1 THEN NOW() - INTERVAL '2 days'
    WHEN l.sort_order = 2 AND RANDOM() > 0.5 THEN NOW() - INTERVAL '1 day'
    ELSE NULL
  END as completed_at,
  CASE 
    WHEN l.sort_order = 1 THEN l.duration_minutes * 60
    WHEN l.sort_order = 2 AND RANDOM() > 0.5 THEN l.duration_minutes * 60
    ELSE FLOOR(RANDOM() * l.duration_minutes * 30)
  END as watched_seconds
FROM profiles p 
CROSS JOIN lessons l
WHERE p.role = 'student' 
  AND NOT EXISTS (
    SELECT 1 FROM lesson_progress lp 
    WHERE lp.user_id = p.id AND lp.lesson_id = l.id
  )
LIMIT 500;