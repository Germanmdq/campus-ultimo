SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

SELECT 
  u.id as user_id, 
  u.email, 
  p.id as profile_id,
  p.role,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'enroll_in_course';

SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
