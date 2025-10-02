-- Crear tablas de eventos y notificaciones si no existen

-- 1. Crear tabla events
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    target_scope TEXT NOT NULL DEFAULT 'all' CHECK (target_scope IN ('all', 'students', 'teachers')),
    meeting_url TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla event_notifications
CREATE TABLE IF NOT EXISTS public.event_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL DEFAULT 'event_created',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_target_scope ON public.events(target_scope);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_event_notifications_user_id ON public.event_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_event_id ON public.event_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_read_at ON public.event_notifications(read_at);

-- 4. Deshabilitar RLS temporalmente para evitar problemas
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_notifications DISABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS básicas (opcional, para cuando se habilite RLS)
DO $$ 
BEGIN
    -- Políticas para events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_select_policy') THEN
        CREATE POLICY events_select_policy ON public.events
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_insert_policy') THEN
        CREATE POLICY events_insert_policy ON public.events
            FOR INSERT WITH CHECK (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_update_policy') THEN
        CREATE POLICY events_update_policy ON public.events
            FOR UPDATE USING (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_delete_policy') THEN
        CREATE POLICY events_delete_policy ON public.events
            FOR DELETE USING (auth.uid() = created_by);
    END IF;
    
    -- Políticas para event_notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_notifications' AND policyname = 'event_notifications_select_policy') THEN
        CREATE POLICY event_notifications_select_policy ON public.event_notifications
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_notifications' AND policyname = 'event_notifications_insert_policy') THEN
        CREATE POLICY event_notifications_insert_policy ON public.event_notifications
            FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_notifications' AND policyname = 'event_notifications_update_policy') THEN
        CREATE POLICY event_notifications_update_policy ON public.event_notifications
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Crear función para limpiar eventos antiguos
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS void AS $$
BEGIN
    DELETE FROM public.events 
    WHERE end_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
