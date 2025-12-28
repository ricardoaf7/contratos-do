/* 
  Correção de Permissões (RLS) para Execução Financeira
  Permite que usuários autenticados gerenciem os lançamentos sem restrição estrita de 'fiscal'.
*/

-- Remove políticas existentes restritivas
DROP POLICY IF EXISTS "Users can view financial executions" ON execucoes_financeiras;
DROP POLICY IF EXISTS "Users can insert financial executions" ON execucoes_financeiras;
DROP POLICY IF EXISTS "Users can update financial executions" ON execucoes_financeiras;
DROP POLICY IF EXISTS "Users can delete financial executions" ON execucoes_financeiras;

-- Cria novas políticas permissivas para usuários logados
CREATE POLICY "Enable read access for authenticated users"
ON execucoes_financeiras FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON execucoes_financeiras FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON execucoes_financeiras FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users"
ON execucoes_financeiras FOR DELETE
TO authenticated
USING (true);

-- Adicionar colunas para Pedido de Empenho (SEI) se ainda não existirem
ALTER TABLE execucoes_financeiras
ADD COLUMN IF NOT EXISTS pedido_empenho_sei TEXT,
ADD COLUMN IF NOT EXISTS data_pedido_empenho DATE,
ADD COLUMN IF NOT EXISTS is_pedido_empenho BOOLEAN DEFAULT FALSE;
