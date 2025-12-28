/* 
  Atualização da tabela de Execução Financeira para suportar controle orçamentário detalhado 
  Baseado na planilha de controle de empenhos, NFs e liquidações.
*/

-- Adicionar colunas para detalhamento financeiro
ALTER TABLE execucoes_financeiras
ADD COLUMN IF NOT EXISTS numero_empenho TEXT,
ADD COLUMN IF NOT EXISTS data_empenho DATE,
ADD COLUMN IF NOT EXISTS valor_empenho DECIMAL(15,2) DEFAULT 0,

ADD COLUMN IF NOT EXISTS numero_nf TEXT,
ADD COLUMN IF NOT EXISTS data_nf DATE,
ADD COLUMN IF NOT EXISTS valor_nf DECIMAL(15,2) DEFAULT 0,

ADD COLUMN IF NOT EXISTS numero_liquidacao TEXT,
ADD COLUMN IF NOT EXISTS data_liquidacao DATE,
ADD COLUMN IF NOT EXISTS valor_liquidacao DECIMAL(15,2) DEFAULT 0,

-- Impostos e Retenções
ADD COLUMN IF NOT EXISTS valor_iss DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_retencoes DECIMAL(15,2) DEFAULT 0, -- IR, INSS, CSLL, COFINS, PIS/PASEP
ADD COLUMN IF NOT EXISTS valor_glosa DECIMAL(15,2) DEFAULT 0,

-- Estornos
ADD COLUMN IF NOT EXISTS estorno_valor DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estorno_data DATE,
ADD COLUMN IF NOT EXISTS estorno_motivo TEXT,

-- Organização
ADD COLUMN IF NOT EXISTS mes_referencia DATE, -- Para agrupar por competência (ex: 2025-01-01 para Janeiro)
ADD COLUMN IF NOT EXISTS ano_referencia INTEGER; -- Ex: 2025

-- Atualizar tipo_documento para aceitar novos tipos se necessário (embora seja TEXT, bom padronizar no front)
-- Tipos esperados: 'Empenho', 'Nota Fiscal', 'Liquidação', 'Pagamento', 'Estorno'
