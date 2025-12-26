-- 1. Drop the old constraint FIRST so we can update the data
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Update existing data ('admin' is no longer valid, move to 'diretor')
UPDATE profiles SET role = 'diretor' WHERE role = 'admin';

-- 3. Now add the new constraint with the new values
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('diretor', 'gerente', 'fiscal'));

-- 4. Add manager_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id);

-- 5. Refresh RLS Policies (same as before)

DROP POLICY IF EXISTS "Authenticated users can view contracts" ON contratos;
DROP POLICY IF EXISTS "Only admins can insert contracts" ON contratos;
DROP POLICY IF EXISTS "Only admins can update contracts" ON contratos;
DROP POLICY IF EXISTS "Diretor view all contracts" ON contratos;
DROP POLICY IF EXISTS "Gerente view team contracts" ON contratos;
DROP POLICY IF EXISTS "Fiscal view assigned contracts" ON contratos;
DROP POLICY IF EXISTS "Diretor manage contracts" ON contratos;
DROP POLICY IF EXISTS "Diretor manage all contracts" ON contratos;
DROP POLICY IF EXISTS "Fiscal update assigned contracts" ON contratos;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Diretor manage profiles" ON profiles;

-- Profiles Policies
CREATE POLICY "Authenticated users can view all profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Diretor manage profiles" 
ON profiles FOR ALL
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'diretor')
);

-- Contracts Policies

-- SELECT (View)
CREATE POLICY "Diretor view all contracts" 
ON contratos FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'diretor')
);

CREATE POLICY "Gerente view team contracts" 
ON contratos FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles manager 
    JOIN profiles fiscal ON fiscal.manager_id = manager.id
    WHERE manager.user_id = auth.uid() 
    AND manager.role = 'gerente'
    AND fiscal.user_id = contratos.fiscal_responsavel
  )
);

CREATE POLICY "Fiscal view assigned contracts" 
ON contratos FOR SELECT 
TO authenticated 
USING (
  fiscal_responsavel = auth.uid()
);

-- INSERT/UPDATE/DELETE (Manage)
CREATE POLICY "Diretor manage all contracts" 
ON contratos FOR ALL
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'diretor')
);

CREATE POLICY "Fiscal update assigned contracts" 
ON contratos FOR UPDATE
TO authenticated 
USING (
  fiscal_responsavel = auth.uid()
);
