-- Tabela para rastrear pagamentos parciais de fiado
CREATE TABLE IF NOT EXISTS public.fiado_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  forma_pagamento TEXT NOT NULL,
  observacao TEXT,
  empresa_id INTEGER NOT NULL REFERENCES public.empresa(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_comanda ON public.fiado_pagamentos(comanda_id);
CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_cliente ON public.fiado_pagamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_empresa ON public.fiado_pagamentos(empresa_id);

ALTER TABLE public.fiado_pagamentos ENABLE ROW LEVEL SECURITY;

-- Coluna para rastrear valor ja pago em comandas fiado
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS fiado_valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0;
