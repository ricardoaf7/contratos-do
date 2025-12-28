/* Migration: Refactor Aditivos for Types and Manual Numbering */

-- Add new columns
ALTER TABLE public.aditivos 
ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('Aditivo', 'Apostilamento')) DEFAULT 'Aditivo',
ADD COLUMN IF NOT EXISTS numero_aditivo TEXT;

-- Update existing records to have defaults
UPDATE public.aditivos 
SET tipo = 'Aditivo', numero_aditivo = numero_sequencial::text 
WHERE numero_aditivo IS NULL;
