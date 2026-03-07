-- Criar políticas RLS para fiado_pagamentos (tabela tinha RLS habilitado mas sem políticas)
DROP POLICY IF EXISTS "fiado_pagamentos_select" ON public.fiado_pagamentos;
DROP POLICY IF EXISTS "fiado_pagamentos_insert" ON public.fiado_pagamentos;
DROP POLICY IF EXISTS "fiado_pagamentos_update" ON public.fiado_pagamentos;
DROP POLICY IF EXISTS "fiado_pagamentos_delete" ON public.fiado_pagamentos;

CREATE POLICY "fiado_pagamentos_select" ON public.fiado_pagamentos
  FOR SELECT USING (empresa_id = get_user_empresa_id());

CREATE POLICY "fiado_pagamentos_insert" ON public.fiado_pagamentos
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "fiado_pagamentos_update" ON public.fiado_pagamentos
  FOR UPDATE USING (empresa_id = get_user_empresa_id());

CREATE POLICY "fiado_pagamentos_delete" ON public.fiado_pagamentos
  FOR DELETE USING (empresa_id = get_user_empresa_id());
