-- Crear tabla para notificaciones de eventos (sin el usuario que ya existe)
CREATE TABLE IF NOT EXISTS public.event_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    notification_type text NOT NULL DEFAULT 'event_created',
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(event_id, user_id, notification_type)
);

-- Habilitar RLS para notificaciones
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para notificaciones
CREATE POLICY "Users can view own notifications"
ON public.event_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.event_notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.event_notifications
FOR INSERT
WITH CHECK (true);

-- Función para crear notificaciones automáticas
CREATE OR REPLACE FUNCTION public.notify_forum_members_of_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Si el evento tiene un program_id, notificar a todos los estudiantes inscritos
    IF NEW.visibility = 'all' OR NEW.visibility = 'students' THEN
        INSERT INTO event_notifications (event_id, user_id, notification_type)
        SELECT NEW.id, p.id, 'event_created'
        FROM profiles p
        WHERE p.role IN ('student', 'teacher', 'admin')
        ON CONFLICT (event_id, user_id, notification_type) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger para crear notificaciones automáticamente
CREATE TRIGGER trigger_notify_forum_members_of_event
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION notify_forum_members_of_event();