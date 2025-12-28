/*
  Adiciona campos de checklist para o fluxo de Nota Fiscal -> Liquidação
*/

ALTER TABLE execucoes_financeiras
ADD COLUMN IF NOT EXISTS recebimento_servico_bool BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recebimento_servico_data DATE,

ADD COLUMN IF NOT EXISTS parecer_tecnico_campo_bool BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parecer_tecnico_campo_data DATE,

ADD COLUMN IF NOT EXISTS parecer_tecnico_doc_bool BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parecer_tecnico_doc_data DATE;

-- Comentário: Estes campos permitem o controle de etapas antes da liquidação financeira efetiva.
