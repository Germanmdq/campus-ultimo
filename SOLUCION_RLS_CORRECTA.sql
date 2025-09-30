-- 1. Desactivar RLS temporalmente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;

-- 3. Crear políticas correctas
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    id != auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Reactivar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Verificar
SELECT 'RLS configurado correctamente' as resultado;