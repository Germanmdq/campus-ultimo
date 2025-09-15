-- Crear un programa de prueba
INSERT INTO public.programs (
  title,
  slug,
  summary,
  published_at
) VALUES (
  'Geometría Sagrada Completa',
  'geometria-sagrada-completa',
  'Un programa completo para aprender los fundamentos de la geometría sagrada desde cero',
  now()
);

-- Crear un curso con 3 lecciones de video
INSERT INTO public.courses (
  title,
  slug,
  summary,
  program_id,
  published_at
) VALUES (
  'Introducción a la Geometría Sagrada',
  'introduccion-geometria-sagrada',
  'Aprende los conceptos básicos y la historia de la geometría sagrada',
  (SELECT id FROM public.programs WHERE slug = 'geometria-sagrada-completa'),
  now()
);

-- Crear 3 lecciones de video para el curso
INSERT INTO public.lessons (
  title,
  slug,
  description,
  video_url,
  sort_order,
  course_id
) VALUES
(
  'Historia y Fundamentos',
  'historia-fundamentos',
  'Descubre los orígenes históricos y los principios fundamentales de la geometría sagrada',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  1,
  (SELECT id FROM public.courses WHERE slug = 'introduccion-geometria-sagrada')
),
(
  'El Círculo y la Vesica Piscis',
  'circulo-vesica-piscis',
  'Explora la simbología del círculo perfecto y la forma fundamental vesica piscis',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  2,
  (SELECT id FROM public.courses WHERE slug = 'introduccion-geometria-sagrada')
),
(
  'La Flor de la Vida',
  'flor-de-la-vida',
  'Comprende el patrón universal de la Flor de la Vida y su significado espiritual',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  3,
  (SELECT id FROM public.courses WHERE slug = 'introduccion-geometria-sagrada')
);