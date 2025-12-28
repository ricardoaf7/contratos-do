/*
  Nova estrutura para o fluxo de Execução de Despesas Mensal
  Agrupa lançamentos financeiros (Empenho, NF, Liquidação) em um "Dossiê" mensal.
*/

-- Tabela para agrupar o processo de execução de um mês específico
CREATE TABLE IF NOT EXISTS processos_execucao_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  
  -- Competência
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia INTEGER NOT NULL,
  
  -- Identificação SEI (O "Dossiê")
  numero_processo_sei VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Em Aberto' CHECK (status IN ('Em Aberto', 'Em Andamento', 'Finalizado', 'Cancelado')),
  
  -- Métricas e Quantitativos (Opcional, vindo da NF)
  descricao_servicos TEXT, -- Ex: "Roçada, Coleta de Lixo"
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garante que só existe um processo por mês/ano para cada contrato
  UNIQUE(contrato_id, mes_referencia, ano_referencia)
);

-- Vincular os lançamentos financeiros ao processo mensal
ALTER TABLE execucoes_financeiras
ADD COLUMN IF NOT EXISTS processo_execucao_id UUID REFERENCES processos_execucao_mensal(id) ON DELETE CASCADE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_processos_contrato ON processos_execucao_mensal(contrato_id);
CREATE INDEX IF NOT EXISTS idx_processos_competencia ON processos_execucao_mensal(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_execucoes_processo ON execucoes_financeiras(processo_execucao_id);

-- RLS Policies para a nova tabela
ALTER TABLE processos_execucao_mensal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view processos_execucao_mensal" 
  ON processos_execucao_mensal FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM contratos 
      WHERE id = contrato_id 
      AND fiscal_responsavel = auth.uid()
    )
  );

CREATE POLICY "Users can insert processos_execucao_mensal" 
  ON processos_execucao_mensal FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM contratos 
      WHERE id = contrato_id 
      AND fiscal_responsavel = auth.uid()
    )
  );

CREATE POLICY "Users can update processos_execucao_mensal" 
  ON processos_execucao_mensal FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM contratos 
      WHERE id = contrato_id 
      AND fiscal_responsavel = auth.uid()
    )
  );
