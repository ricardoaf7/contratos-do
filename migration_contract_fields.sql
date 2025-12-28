/* Migration: Add Contract Number and Modality Number fields */

ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS numero_contrato TEXT,
ADD COLUMN IF NOT EXISTS numero_modalidade TEXT;
