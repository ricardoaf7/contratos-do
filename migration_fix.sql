-- 1. Adiciona a coluna username se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text;

-- 2. Garante que seja único para evitar duplicidade de login
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 3. (Opcional) Adiciona política para permitir que a Service Role (Edge Function) insira dados
-- Geralmente a Service Role tem acesso total, mas é bom garantir que não há Policies bloqueando
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Garante que o usuário autenticado possa ler seu próprio profile
CREATE POLICY "Users can read own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Garante que diretores/gerentes possam ler todos os profiles (ajuste conforme sua lógica)
CREATE POLICY "Staff can read all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('diretor', 'gerente')
  )
);
