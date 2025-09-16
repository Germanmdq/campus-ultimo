-- Optimización de rendimiento para el dashboard de administración
-- Agregar índices para mejorar la velocidad de las consultas

-- Índices para lesson_progress (consultas más frecuentes)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_updated_at ON lesson_progress(updated_at);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_updated ON lesson_progress(user_id, updated_at);

-- Índices para enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_status ON enrollments(user_id, status);

-- Índices para course_enrollments
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_status ON course_enrollments(user_id, status);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role_created ON profiles(role, created_at);

-- Índices para assignments
CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON assignments(created_at);
CREATE INDEX IF NOT EXISTS idx_assignments_user_created ON assignments(user_id, created_at);

-- Índices para messages (si existe)
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_created ON messages(sender_id, created_at);

-- Índices para programs
CREATE INDEX IF NOT EXISTS idx_programs_published_at ON programs(published_at);

-- Índices para program_courses
CREATE INDEX IF NOT EXISTS idx_program_courses_course_id ON program_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_program_id ON program_courses(program_id);

-- Índices compuestos para consultas complejas
CREATE INDEX IF NOT EXISTS idx_lesson_progress_watched_updated ON lesson_progress(watched_seconds, updated_at) WHERE watched_seconds > 0;
CREATE INDEX IF NOT EXISTS idx_profiles_role_created_at ON profiles(role, created_at) WHERE role IN ('student', 'teacher', 'voluntario');

-- Análisis de tablas para optimizar el plan de consultas
ANALYZE lesson_progress;
ANALYZE enrollments;
ANALYZE course_enrollments;
ANALYZE profiles;
ANALYZE assignments;
ANALYZE programs;
ANALYZE program_courses;
