/* 1. Tabela de Gerencias */
CREATE TABLE IF NOT EXISTS public.gerencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

/* 2. Tabela de Setores */
CREATE TABLE IF NOT EXISTS public.setores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    gerencia_id UUID REFERENCES public.gerencias(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(nome, gerencia_id)
);

/* 3. Atualizar Tabela Profiles */
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gerencia_id UUID REFERENCES public.gerencias(id) ON DELETE SET NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL;

/* 4. Inserir Dados Iniciais Gerencias */
INSERT INTO public.gerencias (nome) VALUES 
('Resíduos'),
('Limpeza Urbana'),
('CTR'),
('Posturas'),
('Espaço Público')
ON CONFLICT (nome) DO NOTHING;

/* 5. Inserir Dados Iniciais Setores */
DO $$
DECLARE
    v_residuos_id UUID;
    v_limpeza_id UUID;
BEGIN
    SELECT id INTO v_residuos_id FROM public.gerencias WHERE nome = 'Resíduos';
    SELECT id INTO v_limpeza_id FROM public.gerencias WHERE nome = 'Limpeza Urbana';

    IF v_residuos_id IS NOT NULL THEN
        INSERT INTO public.setores (nome, gerencia_id) VALUES
        ('Resíduos Recicláveis', v_residuos_id),
        ('Resíduos Rejeitos', v_residuos_id),
        ('Resíduos de Descarte Irregular', v_residuos_id),
        ('PEVs', v_residuos_id)
        ON CONFLICT (nome, gerencia_id) DO NOTHING;
    END IF;

    IF v_limpeza_id IS NOT NULL THEN
        INSERT INTO public.setores (nome, gerencia_id) VALUES
        ('Roçagem Áreas Públicas', v_limpeza_id),
        ('Jardinagem', v_limpeza_id),
        ('Varrição', v_limpeza_id),
        ('Boca de Lobo', v_limpeza_id)
        ON CONFLICT (nome, gerencia_id) DO NOTHING;
    END IF;
END $$;

/* 6. Habilitar RLS */
ALTER TABLE public.gerencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

/* Politicas */
DROP POLICY IF EXISTS "Leitura pública de gerencias" ON public.gerencias;
CREATE POLICY "Leitura pública de gerencias" ON public.gerencias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita de gerencias para admin" ON public.gerencias;
CREATE POLICY "Escrita de gerencias para admin" ON public.gerencias FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Leitura pública de setores" ON public.setores;
CREATE POLICY "Leitura pública de setores" ON public.setores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita de setores para admin" ON public.setores;
CREATE POLICY "Escrita de setores para admin" ON public.setores FOR INSERT TO authenticated WITH CHECK (true);
