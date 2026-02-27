-- =============================================
-- MULTI-TENANCY: Isolamento de dados por empresa
-- Adiciona empresa_id em todas as tabelas operacionais,
-- reescreve RLS para filtrar por empresa, e cria
-- infraestrutura para auto-registro SaaS.
-- =============================================

-- =============================================
-- 1A: Adicionar codigo_acesso na tabela empresa
-- =============================================

ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS codigo_acesso VARCHAR(8) UNIQUE;

-- Gerar codigo para empresa existente (id=1)
UPDATE public.empresa
SET codigo_acesso = UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6))
WHERE id = 1 AND codigo_acesso IS NULL;

-- =============================================
-- 1B: Adicionar empresa_id em 10 tabelas
-- =============================================

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.profiles SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN empresa_id SET DEFAULT 1;

-- categorias
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.categorias SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.categorias ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.categorias ALTER COLUMN empresa_id SET DEFAULT 1;

-- produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.produtos SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.produtos ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.produtos ALTER COLUMN empresa_id SET DEFAULT 1;

-- mesas
ALTER TABLE public.mesas
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.mesas SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.mesas ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.mesas ALTER COLUMN empresa_id SET DEFAULT 1;

-- comandas
ALTER TABLE public.comandas
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.comandas SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.comandas ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.comandas ALTER COLUMN empresa_id SET DEFAULT 1;

-- comanda_itens
ALTER TABLE public.comanda_itens
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.comanda_itens SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.comanda_itens ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.comanda_itens ALTER COLUMN empresa_id SET DEFAULT 1;

-- caixa
ALTER TABLE public.caixa
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.caixa SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.caixa ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.caixa ALTER COLUMN empresa_id SET DEFAULT 1;

-- caixa_turnos
ALTER TABLE public.caixa_turnos
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.caixa_turnos SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.caixa_turnos ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.caixa_turnos ALTER COLUMN empresa_id SET DEFAULT 1;

-- clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.clientes SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.clientes ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN empresa_id SET DEFAULT 1;

-- estoque_movimentos
ALTER TABLE public.estoque_movimentos
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES public.empresa(id);
UPDATE public.estoque_movimentos SET empresa_id = 1 WHERE empresa_id IS NULL;
ALTER TABLE public.estoque_movimentos ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.estoque_movimentos ALTER COLUMN empresa_id SET DEFAULT 1;

-- =============================================
-- 1C: Indices por empresa_id
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_empresa ON public.profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_empresa ON public.categorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON public.produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mesas_empresa ON public.mesas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_comandas_empresa ON public.comandas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_comanda_itens_empresa ON public.comanda_itens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_empresa ON public.caixa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_turnos_empresa ON public.caixa_turnos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_empresa ON public.estoque_movimentos(empresa_id);

-- =============================================
-- 1D: Fix constraint categorias_nome_key -> UNIQUE(nome, empresa_id)
-- =============================================

ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_nome_key;
ALTER TABLE public.categorias ADD CONSTRAINT categorias_nome_empresa_unique UNIQUE(nome, empresa_id);

-- =============================================
-- 2: Funcao helper — retorna empresa_id do usuario logado
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS INTEGER AS $$
  SELECT empresa_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- 3: Reescrever TODAS as RLS policies
-- =============================================

-- DROP todas as policies existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'categorias', 'produtos', 'mesas',
        'comandas', 'comanda_itens', 'caixa', 'caixa_turnos',
        'clientes', 'estoque_movimentos', 'empresa'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- EMPRESA
CREATE POLICY "empresa_select" ON public.empresa
  FOR SELECT USING (id = get_user_empresa_id());
CREATE POLICY "empresa_update" ON public.empresa
  FOR UPDATE USING (id = get_user_empresa_id());

-- PROFILES
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- CATEGORIAS
CREATE POLICY "categorias_select" ON public.categorias
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "categorias_insert" ON public.categorias
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "categorias_update" ON public.categorias
  FOR UPDATE USING (empresa_id = get_user_empresa_id());
CREATE POLICY "categorias_delete" ON public.categorias
  FOR DELETE USING (empresa_id = get_user_empresa_id());

-- PRODUTOS
CREATE POLICY "produtos_select" ON public.produtos
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "produtos_insert" ON public.produtos
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "produtos_update" ON public.produtos
  FOR UPDATE USING (empresa_id = get_user_empresa_id());
CREATE POLICY "produtos_delete" ON public.produtos
  FOR DELETE USING (empresa_id = get_user_empresa_id());

-- MESAS
CREATE POLICY "mesas_select" ON public.mesas
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "mesas_insert" ON public.mesas
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "mesas_update" ON public.mesas
  FOR UPDATE USING (empresa_id = get_user_empresa_id());
CREATE POLICY "mesas_delete" ON public.mesas
  FOR DELETE USING (empresa_id = get_user_empresa_id());

-- COMANDAS
CREATE POLICY "comandas_select" ON public.comandas
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "comandas_insert" ON public.comandas
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "comandas_update" ON public.comandas
  FOR UPDATE USING (empresa_id = get_user_empresa_id());
CREATE POLICY "comandas_delete" ON public.comandas
  FOR DELETE USING (empresa_id = get_user_empresa_id());

-- COMANDA_ITENS
CREATE POLICY "comanda_itens_select" ON public.comanda_itens
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "comanda_itens_insert" ON public.comanda_itens
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "comanda_itens_update" ON public.comanda_itens
  FOR UPDATE USING (empresa_id = get_user_empresa_id());
CREATE POLICY "comanda_itens_delete" ON public.comanda_itens
  FOR DELETE USING (empresa_id = get_user_empresa_id());

-- CAIXA
CREATE POLICY "caixa_select" ON public.caixa
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "caixa_insert" ON public.caixa
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "caixa_update" ON public.caixa
  FOR UPDATE USING (empresa_id = get_user_empresa_id());
CREATE POLICY "caixa_delete" ON public.caixa
  FOR DELETE USING (empresa_id = get_user_empresa_id());

-- CAIXA_TURNOS
CREATE POLICY "caixa_turnos_select" ON public.caixa_turnos
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "caixa_turnos_insert" ON public.caixa_turnos
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "caixa_turnos_update" ON public.caixa_turnos
  FOR UPDATE USING (empresa_id = get_user_empresa_id());

-- CLIENTES
CREATE POLICY "clientes_select" ON public.clientes
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "clientes_insert" ON public.clientes
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "clientes_update" ON public.clientes
  FOR UPDATE USING (empresa_id = get_user_empresa_id());
CREATE POLICY "clientes_delete" ON public.clientes
  FOR DELETE USING (empresa_id = get_user_empresa_id());

-- ESTOQUE_MOVIMENTOS
CREATE POLICY "estoque_movimentos_select" ON public.estoque_movimentos
  FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "estoque_movimentos_insert" ON public.estoque_movimentos
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());

-- =============================================
-- 4: Atualizar trigger handle_new_user
-- Ler empresa_id do raw_user_meta_data, default 1
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, empresa_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'garcom'),
    COALESCE((NEW.raw_user_meta_data->>'empresa_id')::INTEGER, 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
