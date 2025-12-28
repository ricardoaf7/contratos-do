/* Migration: Add novo_valor_mensal to aditivos table */

ALTER TABLE public.aditivos 
ADD COLUMN IF NOT EXISTS novo_valor_mensal NUMERIC;
