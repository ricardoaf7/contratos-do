-- Update roles to match new requirements
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('diretor', 'gerente', 'fiscal'));

-- Add manager_id to allow linking a Fiscal to a Gerente
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id);

-- Update existing admin to diretor (assuming 'admin' was used previously)
UPDATE profiles SET role = 'diretor' WHERE role = 'admin';

-- Refresh RLS Policies for Contracts

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON contratos;
DROP POLICY IF EXISTS "Only admins can insert contracts" ON contratos;
DROP POLICY IF EXISTS "Only admins can update contracts" ON contratos;

-- 1. VIEW POLICIES
-- Diretor sees everything
CREATE POLICY "Diretor view all contracts" 
ON contratos FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'diretor')
);

-- Gerente sees contracts of their fiscals
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

-- Fiscal sees assigned contracts
CREATE POLICY "Fiscal view assigned contracts" 
ON contratos FOR SELECT 
TO authenticated 
USING (
  fiscal_responsavel = auth.uid()
);

-- 2. INSERT/UPDATE POLICIES
-- Diretor has full write access
CREATE POLICY "Diretor manage contracts" 
ON contratos FOR ALL 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'diretor')
);

-- Fiscal can UPDATE specific fields (e.g. execution) - for now giving edit access to assigned contracts
CREATE POLICY "Fiscal update assigned contracts" 
ON contratos FOR UPDATE
TO authenticated 
USING (
  fiscal_responsavel = auth.uid()
);

-- Allow Gerente to view profiles to manage them? No, only Diretor manages profiles.
-- But everyone needs to read profiles to see names.
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Authenticated users can view all profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- Only Diretor can update profiles (to set roles/managers)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Diretor manage profiles" 
ON profiles FOR UPDATE
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'diretor')
);
