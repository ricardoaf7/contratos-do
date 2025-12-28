ALTER TABLE contratos
ADD COLUMN IF NOT EXISTS renovacao_solicitada BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_solicitacao_renovacao DATE,
ADD COLUMN IF NOT EXISTS processo_sei_renovacao TEXT,
ADD COLUMN IF NOT EXISTS justificativa_nao_renovacao TEXT;
