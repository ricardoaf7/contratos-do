/* Migration: Add valor_mensal_inicial to support detailed original contract view */

ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS valor_mensal_inicial NUMERIC;

-- Initialize with current valor_mensal for existing records where it is null
UPDATE public.contratos 
SET valor_mensal_inicial = valor_mensal
WHERE valor_mensal_inicial IS NULL;
