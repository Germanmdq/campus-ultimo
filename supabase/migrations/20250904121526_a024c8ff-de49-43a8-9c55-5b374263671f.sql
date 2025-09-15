-- Insertar datos de ejemplo para testing

-- Crear un programa de ejemplo
INSERT INTO public.programs (id, title, slug, summary, sort_order, published_at) 
VALUES (
  gen_random_uuid(),
  'Geometría Sagrada Nivel 1', 
  'geometria-sagrada-nivel-1',
  'Fundamentos y principios básicos de la geometría sagrada. Explora los patrones universales que conectan todas las formas de vida.',
  1,
  NOW()
);

-- Obtener el ID del programa para los cursos
DO $$
DECLARE
    program_id UUID;
    course1_id UUID;
    course2_id UUID;
    lesson1_id UUID;
    lesson2_id UUID;
    lesson3_id UUID;
BEGIN
    -- Obtener el ID del programa
    SELECT id INTO program_id FROM public.programs WHERE slug = 'geometria-sagrada-nivel-1';
    
    -- Crear cursos
    INSERT INTO public.courses (id, program_id, title, slug, summary, sort_order, published_at) 
    VALUES 
    (gen_random_uuid(), program_id, 'Introducción a la Geometría Sagrada', 'introduccion-geometria-sagrada', 'Conceptos básicos y historia de la geometría sagrada', 1, NOW()),
    (gen_random_uuid(), program_id, 'Formas y Patrones Universales', 'formas-patrones-universales', 'Estudio de las formas geométricas fundamentales', 2, NOW());
    
    -- Obtener IDs de los cursos
    SELECT id INTO course1_id FROM public.courses WHERE slug = 'introduccion-geometria-sagrada';
    SELECT id INTO course2_id FROM public.courses WHERE slug = 'formas-patrones-universales';
    
    -- Crear lecciones para el primer curso
    INSERT INTO public.lessons (id, course_id, title, slug, description, video_url, sort_order, has_materials, requires_admin_approval, has_assignment)
    VALUES 
    (gen_random_uuid(), course1_id, 'Bienvenida al Mundo de la Geometría Sagrada', 'bienvenida-geometria-sagrada', 'Una introducción completa a los conceptos fundamentales de la geometría sagrada y su importancia en el universo.', 'https://example.com/video1', 1, false, false, false),
    (gen_random_uuid(), course1_id, 'Los Números y las Formas', 'numeros-y-formas', 'Exploración de la relación entre los números sagrados y las formas geométricas. Incluye trabajo práctico sobre la proporción áurea.', 'https://example.com/video2', 2, true, true, true),
    (gen_random_uuid(), course1_id, 'La Flor de la Vida', 'flor-de-la-vida', 'Estudio profundo del patrón más importante en geometría sagrada: La Flor de la Vida y sus múltiples aplicaciones.', 'https://example.com/video3', 3, false, false, false);
    
    -- Obtener IDs de las lecciones
    SELECT id INTO lesson1_id FROM public.lessons WHERE slug = 'bienvenida-geometria-sagrada';
    SELECT id INTO lesson2_id FROM public.lessons WHERE slug = 'numeros-y-formas';
    SELECT id INTO lesson3_id FROM public.lessons WHERE slug = 'flor-de-la-vida';
    
    -- Agregar materiales para la lección 2
    INSERT INTO public.lesson_materials (lesson_id, title, type, url, sort_order)
    VALUES 
    (lesson2_id, 'Guía PDF: Proporción Áurea en la Naturaleza', 'file', 'https://example.com/proporcion-aurea.pdf', 1),
    (lesson2_id, 'Calculadora de Proporción Áurea Online', 'link', 'https://calculator.net/golden-ratio-calculator.html', 2);
    
    -- Actualizar instrucciones para el trabajo práctico
    UPDATE public.lessons 
    SET assignment_instructions = 'Encuentra 3 ejemplos de la proporción áurea en la naturaleza. Toma fotografías y explica en un texto de 200-300 palabras cómo se manifiesta este principio en cada ejemplo. Sube las imágenes y el texto explicativo.'
    WHERE id = lesson2_id;
    
END $$;