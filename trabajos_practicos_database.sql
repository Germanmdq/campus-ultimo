-- ========================================
-- ESTRUCTURA DE BASE DE DATOS - TRABAJOS PRÁCTICOS
-- ========================================

-- 1. TABLA PRINCIPAL DE TRABAJOS PRÁCTICOS
CREATE TABLE assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  file_url TEXT,
  text_answer TEXT,
  grade INTEGER,
  feedback TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único para evitar duplicados
  UNIQUE(user_id, lesson_id)
);

-- 2. ÍNDICES PARA OPTIMIZAR CONSULTAS
CREATE INDEX idx_assignments_user_id ON assignments(user_id);
CREATE INDEX idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_created_at ON assignments(created_at);

-- 3. TRIGGER PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();

-- 4. TRIGGER PARA MARCAR LECCIÓN COMO COMPLETADA AL APROBAR
CREATE OR REPLACE FUNCTION handle_assignment_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo ejecutar si el status cambió a 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Insertar o actualizar lesson_progress
    INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at)
    VALUES (NEW.user_id, NEW.lesson_id, true, NOW())
    ON CONFLICT (user_id, lesson_id)
    DO UPDATE SET 
      completed = true,
      completed_at = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_assignment_approval
  AFTER UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION handle_assignment_approval();

-- 5. POLÍTICAS RLS (Row Level Security)
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Los estudiantes pueden ver sus propias entregas
CREATE POLICY "Students can view their own assignments" ON assignments
  FOR SELECT USING (auth.uid() = user_id);

-- Los estudiantes pueden insertar sus propias entregas
CREATE POLICY "Students can insert their own assignments" ON assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los estudiantes pueden actualizar sus propias entregas (para re-envío)
CREATE POLICY "Students can update their own assignments" ON assignments
  FOR UPDATE USING (auth.uid() = user_id);

-- Los profesores y admins pueden ver todas las entregas
CREATE POLICY "Teachers and admins can view all assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('teacher', 'admin', 'formador')
    )
  );

-- Los profesores y admins pueden actualizar todas las entregas
CREATE POLICY "Teachers and admins can update all assignments" ON assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('teacher', 'admin', 'formador')
    )
  );

-- 6. FUNCIÓN PARA OBTENER ESTADÍSTICAS DE TRABAJOS
CREATE OR REPLACE FUNCTION get_assignment_stats()
RETURNS TABLE (
  total_assignments BIGINT,
  pending_assignments BIGINT,
  approved_assignments BIGINT,
  rejected_assignments BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_assignments,
    COUNT(*) FILTER (WHERE status = 'submitted') as pending_assignments,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_assignments,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_assignments
  FROM assignments;
END;
$$ LANGUAGE plpgsql;

-- 7. VISTA PARA TRABAJOS CON INFORMACIÓN COMPLETA
CREATE VIEW assignments_with_details AS
SELECT 
  a.*,
  p.full_name as student_name,
  p.email as student_email,
  l.title as lesson_title,
  c.title as course_title,
  r.full_name as reviewer_name
FROM assignments a
LEFT JOIN profiles p ON a.user_id = p.id
LEFT JOIN lessons l ON a.lesson_id = l.id
LEFT JOIN courses c ON l.course_id = c.id
LEFT JOIN profiles r ON a.reviewed_by = r.id;

-- 8. FUNCIÓN PARA ENVIAR EMAIL DE NOTIFICACIÓN
CREATE OR REPLACE FUNCTION send_assignment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo enviar email si el status cambió a 'approved' o 'rejected'
  IF NEW.status IN ('approved', 'rejected') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    -- Aquí se integraría con el sistema de emails
    -- Por ahora solo log
    RAISE LOG 'Assignment % status changed to % for user %', NEW.id, NEW.status, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_send_assignment_notification
  AFTER UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION send_assignment_notification();
