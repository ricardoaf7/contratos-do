/* Script para garantir estrutura da Diretoria */

-- 1. Criar Gerência 'Diretoria' se não existir
INSERT INTO public.gerencias (nome) 
VALUES ('Diretoria') 
ON CONFLICT (nome) DO NOTHING;

-- 2. Criar Setor 'Diretoria de Operações' vinculado à Gerência 'Diretoria'
DO $$
DECLARE
    v_diretoria_id UUID;
BEGIN
    SELECT id INTO v_diretoria_id FROM public.gerencias WHERE nome = 'Diretoria';

    IF v_diretoria_id IS NOT NULL THEN
        INSERT INTO public.setores (nome, gerencia_id) 
        VALUES ('Diretoria de Operações', v_diretoria_id)
        ON CONFLICT (nome, gerencia_id) DO NOTHING;
    END IF;
END $$;
