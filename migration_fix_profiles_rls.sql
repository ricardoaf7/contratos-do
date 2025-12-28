/* Script para corrigir permissões de Edição na tabela Profiles (RLS) */

-- 1. Habilitar RLS na tabela profiles (caso não esteja)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Leitura pública de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Diretores podem atualizar qualquer perfil" ON public.profiles;
DROP POLICY IF EXISTS "Diretores podem deletar perfis" ON public.profiles;

-- 3. Criar Políticas

-- Leitura: Todos os usuários autenticados podem ler os perfis (necessário para listar a equipe)
CREATE POLICY "Leitura pública de perfis" ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Update: Diretores podem atualizar qualquer perfil
CREATE POLICY "Diretores podem atualizar qualquer perfil" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'diretor'
  )
);

-- Update: Usuários podem atualizar seu PRÓPRIO perfil (opcional, mas boa prática)
CREATE POLICY "Usuários podem atualizar próprio perfil" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
);

-- Delete: Apenas Diretores podem deletar perfis
CREATE POLICY "Diretores podem deletar perfis" ON public.profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'diretor'
  )
);

-- Insert: Geralmente feito via Edge Function (Service Role), mas se precisar via client:
-- CREATE POLICY "Diretores podem criar perfis" ...
