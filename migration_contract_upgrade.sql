/* Migration: Upgrade Contratos Schema */

-- 1. Alter Table Contratos
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS nome_exibicao TEXT,
ADD COLUMN IF NOT EXISTS valor_inicial NUMERIC,
ADD COLUMN IF NOT EXISTS data_vencimento_inicial DATE,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Initialize new columns with existing data for consistency
UPDATE public.contratos 
SET 
    valor_inicial = valor_anual,
    data_vencimento_inicial = data_vencimento,
    nome_exibicao = empresa_contratada
WHERE valor_inicial IS NULL;

-- 2. Create Table Aditivos
CREATE TABLE IF NOT EXISTS public.aditivos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
    numero_sequencial INTEGER NOT NULL,
    data_assinatura DATE NOT NULL,
    valor_aditivo NUMERIC DEFAULT 0, -- Can be negative
    novo_vencimento DATE,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Create Table Contrato_Versoes (History)
CREATE TABLE IF NOT EXISTS public.contrato_versoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id),
    snapshot_data JSONB -- Stores the full state of the contract at that time
);

-- 4. RLS Policies
ALTER TABLE public.aditivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_versoes ENABLE ROW LEVEL SECURITY;

-- Aditivos Policies
CREATE POLICY "Leitura pública de aditivos" ON public.aditivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escrita de aditivos para diretores/gerentes" ON public.aditivos FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('diretor', 'gerente'))
);

-- History Policies
CREATE POLICY "Leitura pública de versoes" ON public.contrato_versoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escrita de versoes para sistema" ON public.contrato_versoes FOR INSERT TO authenticated WITH CHECK (true);
