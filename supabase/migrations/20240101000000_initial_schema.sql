-- create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'fiscal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create index
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- create contratos table
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo VARCHAR(100) NOT NULL,
  modalidade VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  empresa_contratada VARCHAR(255) NOT NULL,
  objeto TEXT NOT NULL,
  valor_mensal DECIMAL(15,2) NOT NULL,
  valor_anual DECIMAL(15,2) NOT NULL,
  data_assinatura DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_limite_legal DATE NOT NULL,
  alerta_ativo BOOLEAN DEFAULT true,
  historico_aditivos TEXT,
  created_by UUID REFERENCES auth.users(id),
  fiscal_responsavel UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create index
CREATE INDEX idx_contratos_numero_processo ON contratos(numero_processo);
CREATE INDEX idx_contratos_data_vencimento ON contratos(data_vencimento);
CREATE INDEX idx_contratos_alerta_ativo ON contratos(alerta_ativo);

-- RLS policies
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read contracts
CREATE POLICY "Authenticated users can view contracts" 
  ON contratos FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow only admins to insert contracts
CREATE POLICY "Only admins can insert contracts" 
  ON contratos FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow only admins to update contracts
CREATE POLICY "Only admins can update contracts" 
  ON contratos FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- create execucoes_financeiras table
CREATE TABLE execucoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  data_lancamento DATE NOT NULL,
  tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('Empenho', 'Nota Fiscal', 'Liquidação', 'Estorno')),
  numero_documento VARCHAR(100) NOT NULL,
  valor_bruto DECIMAL(15,2) NOT NULL,
  valor_impostos DECIMAL(15,2) DEFAULT 0,
  valor_glosas DECIMAL(15,2) DEFAULT 0,
  valor_retencoes DECIMAL(15,2) DEFAULT 0,
  valor_liquido DECIMAL(15,2) NOT NULL,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create index
CREATE INDEX idx_execucoes_contrato_id ON execucoes_financeiras(contrato_id);
CREATE INDEX idx_execucoes_tipo_documento ON execucoes_financeiras(tipo_documento);
CREATE INDEX idx_execucoes_data_lancamento ON execucoes_financeiras(data_lancamento);

-- RLS policies
ALTER TABLE execucoes_financeiras ENABLE ROW LEVEL SECURITY;

-- Allow users to view financial executions for their assigned contracts
CREATE POLICY "Users can view financial executions" 
  ON execucoes_financeiras FOR SELECT 
  TO authenticated 
  USING (
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Fiscal can view only their assigned contracts
    EXISTS (
      SELECT 1 FROM contratos 
      WHERE id = contrato_id 
      AND fiscal_responsavel = auth.uid()
    )
  );

-- Allow users to insert financial executions for their assigned contracts
CREATE POLICY "Users can insert financial executions" 
  ON execucoes_financeiras FOR INSERT 
  TO authenticated 
  WITH CHECK (
    -- Admin can insert for any contract
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Fiscal can insert only for their assigned contracts
    EXISTS (
      SELECT 1 FROM contratos 
      WHERE id = contrato_id 
      AND fiscal_responsavel = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

GRANT SELECT ON contratos TO anon, authenticated;
GRANT INSERT ON contratos TO authenticated;
GRANT UPDATE ON contratos TO authenticated;

GRANT SELECT ON execucoes_financeiras TO anon, authenticated;
GRANT INSERT ON execucoes_financeiras TO authenticated;
GRANT UPDATE ON execucoes_financeiras TO authenticated;
