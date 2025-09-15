-- Crear un programa de prueba con slug completamente único
INSERT INTO public.programs (
  title,
  slug,
  summary,
  published_at
) VALUES (
  'Academia de Geometría Sagrada - Curso Principal',
  'academia-gs-curso-principal-2025',
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
  'Fundamentos de Geometría Sagrada',
  'fundamentos-gs-2025',
  'Aprende los conceptos básicos y la historia de la geometría sagrada',
  (SELECT id FROM public.programs WHERE slug = 'academia-gs-curso-principal-2025'),
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
  'Historia y Orígenes Ancestrales',
  'historia-origenes-2025',
  'Descubre los orígenes históricos y los principios fundamentales de la geometría sagrada',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  1,
  (SELECT id FROM public.courses WHERE slug = 'fundamentos-gs-2025')
),
(
  'Círculo Sagrado y Vesica Piscis',
  'circulo-vesica-2025',
  'Explora la simbología del círculo perfecto y la forma fundamental vesica piscis',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  2,
  (SELECT id FROM public.courses WHERE slug = 'fundamentos-gs-2025')
),
(
  'La Flor de la Vida Universal',
  'flor-vida-universal-2025',
  'Comprende el patrón universal de la Flor de la Vida y su significado espiritual',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  3,
  (SELECT id FROM public.courses WHERE slug = 'fundamentos-gs-2025')
);