/* Adicionar coluna email na tabela profiles e preencher dados existentes */

-- 1. Adicionar coluna email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Atualizar emails existentes (Este comando deve ser rodado no SQL Editor do Supabase Dashboard)
-- O usuário logado no Dashboard tem permissão para acessar auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
AND p.email IS NULL;
