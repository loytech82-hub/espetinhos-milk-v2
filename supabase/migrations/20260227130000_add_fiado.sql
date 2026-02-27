-- Migration: Adicionar suporte a fiado nas comandas
ALTER TABLE public.comandas
  ADD COLUMN IF NOT EXISTS fiado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fiado_pago BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fiado_pago_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fiado_prazo_dias INTEGER;

CREATE INDEX IF NOT EXISTS idx_comandas_fiado_pendente
  ON public.comandas(fiado, fiado_pago) WHERE fiado = true AND fiado_pago = false;
