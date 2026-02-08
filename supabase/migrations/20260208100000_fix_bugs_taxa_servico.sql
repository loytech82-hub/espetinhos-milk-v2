-- Fix: unique constraint na mesa para evitar duplicatas
ALTER TABLE public.mesas ADD CONSTRAINT mesas_numero_unique UNIQUE (numero);

-- Fix: estoque_atual default 0 (evitar NULL)
ALTER TABLE public.produtos ALTER COLUMN estoque_atual SET DEFAULT 0;
UPDATE public.produtos SET estoque_atual = 0 WHERE estoque_atual IS NULL;

-- Feature: taxa de servico na comanda
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS taxa_servico NUMERIC DEFAULT 0;
