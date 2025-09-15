-- Auto-complete lesson_progress when an assignment is approved
CREATE OR REPLACE FUNCTION public.set_progress_on_assignment_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.lesson_progress (user_id, lesson_id, completed, approved, updated_at)
    VALUES (NEW.user_id, NEW.lesson_id, true, true, now())
    ON CONFLICT (user_id, lesson_id)
    DO UPDATE SET completed = true, approved = true, updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_progress_on_assignment_approved ON public.assignments;
CREATE TRIGGER trg_set_progress_on_assignment_approved
AFTER UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_progress_on_assignment_approved();

-- Helper to get auth email by user id for notifications
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT email FROM auth.users WHERE id = _user_id;
$$;


