-- Vincular el curso existente con el programa "Actualizate"
INSERT INTO program_courses (program_id, course_id, sort_order)
SELECT 
  '674e33c9-12d0-433b-af3d-414ba6f66374' as program_id,
  'fc9d653b-d261-49ee-ac61-db3258dc5091' as course_id,
  1 as sort_order
WHERE NOT EXISTS (
  SELECT 1 FROM program_courses 
  WHERE program_id = '674e33c9-12d0-433b-af3d-414ba6f66374' 
  AND course_id = 'fc9d653b-d261-49ee-ac61-db3258dc5091'
);

-- También crear inscripciones directas a curso para usuarios que tienen el programa
INSERT INTO course_enrollments (user_id, course_id, status, created_at)
SELECT 
  e.user_id,
  'fc9d653b-d261-49ee-ac61-db3258dc5091' as course_id,
  'active'::enrollment_status,
  now()
FROM enrollments e 
WHERE e.program_id = '674e33c9-12d0-433b-af3d-414ba6f66374'
AND e.status = 'active'
ON CONFLICT (user_id, course_id) DO NOTHING;