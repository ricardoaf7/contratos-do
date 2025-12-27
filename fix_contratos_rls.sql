-- Habilita RLS na tabela de contratos (caso não esteja)
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- 1. Política de LEITURA (SELECT)
-- Permite que qualquer usuário autenticado veja os contratos
CREATE POLICY "Permitir leitura de contratos para autenticados"
ON public.contratos FOR SELECT
TO authenticated
USING (true);

-- 2. Política de INSERÇÃO (INSERT)
-- Permite que usuários autenticados criem contratos
CREATE POLICY "Permitir criação de contratos para autenticados"
ON public.contratos FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Política de ATUALIZAÇÃO (UPDATE)
-- Permite editar contratos
CREATE POLICY "Permitir edição de contratos para autenticados"
ON public.contratos FOR UPDATE
TO authenticated
USING (true);

-- 4. Política de EXCLUSÃO (DELETE)
-- Permite deletar contratos (opcional, pode restringir se quiser)
CREATE POLICY "Permitir exclusão de contratos para autenticados"
ON public.contratos FOR DELETE
TO authenticated
USING (true);
