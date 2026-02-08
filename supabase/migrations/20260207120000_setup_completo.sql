-- =============================================
-- ESPETINHOS MILK - Setup Completo
-- Schema real do banco:
--   produtos.id = UUID, comandas.id = UUID, caixa.id = UUID
--   comanda_itens.id = UUID, mesas.id = INTEGER
--   comandas usa "aberta_em" (nao "created_at")
--   caixa ja tem turno_id
-- =============================================

-- TABELA: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'garcom' CHECK (role IN ('admin', 'caixa', 'garcom')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: criar profile automaticamente ao criar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'garcom')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TABELA: categorias
CREATE TABLE IF NOT EXISTS public.categorias (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cor TEXT DEFAULT '#FF6B35',
  icone TEXT DEFAULT 'package',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorias padrao
INSERT INTO public.categorias (nome, ordem) VALUES
  ('Espetinhos', 1),
  ('Cervejas', 2),
  ('Bebidas', 3),
  ('Cigarros', 4),
  ('Acompanhamentos', 5),
  ('Outros', 99)
ON CONFLICT (nome) DO NOTHING;

-- TABELA: caixa_turnos
CREATE TABLE IF NOT EXISTS public.caixa_turnos (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  valor_abertura NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_fechamento NUMERIC(10,2),
  total_entradas NUMERIC(10,2) DEFAULT 0,
  total_saidas NUMERIC(10,2) DEFAULT 0,
  total_vendas NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  observacao_abertura TEXT,
  observacao_fechamento TEXT,
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ
);

-- TABELA: estoque_movimentos (produto_id e comanda_id sao UUID)
CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
  id SERIAL PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'venda', 'cancelamento')),
  quantidade INTEGER NOT NULL,
  estoque_anterior INTEGER NOT NULL,
  estoque_posterior INTEGER NOT NULL,
  motivo TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  comanda_id UUID REFERENCES public.comandas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar campos extras (somente se nao existirem)
-- caixa ja tem turno_id, verificar usuario_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'caixa' AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE public.caixa ADD COLUMN usuario_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comandas' AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE public.comandas ADD COLUMN usuario_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- INDICES (usando nomes de coluna corretos)
CREATE INDEX IF NOT EXISTS idx_comandas_status ON public.comandas(status);
CREATE INDEX IF NOT EXISTS idx_comandas_aberta_em ON public.comandas(aberta_em);
CREATE INDEX IF NOT EXISTS idx_comanda_itens_comanda ON public.comanda_itens(comanda_id);
CREATE INDEX IF NOT EXISTS idx_caixa_created_at ON public.caixa(created_at);
CREATE INDEX IF NOT EXISTS idx_caixa_turno ON public.caixa(turno_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON public.produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_produto ON public.estoque_movimentos(produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_created ON public.estoque_movimentos(created_at);
CREATE INDEX IF NOT EXISTS idx_caixa_turnos_status ON public.caixa_turnos(status);

-- RLS nas novas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_turnos ENABLE ROW LEVEL SECURITY;

-- Funcao helper para verificar role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin" ON public.profiles
  FOR ALL USING (get_user_role() = 'admin');

-- CATEGORIAS policies
CREATE POLICY "categorias_select" ON public.categorias
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categorias_admin" ON public.categorias
  FOR ALL USING (get_user_role() = 'admin');

-- ESTOQUE MOVIMENTOS policies
CREATE POLICY "estoque_mov_select" ON public.estoque_movimentos
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "estoque_mov_insert" ON public.estoque_movimentos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- CAIXA TURNOS policies
CREATE POLICY "caixa_turnos_select" ON public.caixa_turnos
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "caixa_turnos_insert" ON public.caixa_turnos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "caixa_turnos_update" ON public.caixa_turnos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS nas tabelas existentes
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.comanda_itens ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.caixa ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Policies para tabelas existentes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'produtos_select' AND tablename = 'produtos') THEN
    CREATE POLICY "produtos_select" ON public.produtos FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'produtos_insert' AND tablename = 'produtos') THEN
    CREATE POLICY "produtos_insert" ON public.produtos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'produtos_update' AND tablename = 'produtos') THEN
    CREATE POLICY "produtos_update" ON public.produtos FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mesas_select' AND tablename = 'mesas') THEN
    CREATE POLICY "mesas_select" ON public.mesas FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mesas_update' AND tablename = 'mesas') THEN
    CREATE POLICY "mesas_update" ON public.mesas FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comandas_select' AND tablename = 'comandas') THEN
    CREATE POLICY "comandas_select" ON public.comandas FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comandas_insert' AND tablename = 'comandas') THEN
    CREATE POLICY "comandas_insert" ON public.comandas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comandas_update' AND tablename = 'comandas') THEN
    CREATE POLICY "comandas_update" ON public.comandas FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comanda_itens_select' AND tablename = 'comanda_itens') THEN
    CREATE POLICY "comanda_itens_select" ON public.comanda_itens FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comanda_itens_insert' AND tablename = 'comanda_itens') THEN
    CREATE POLICY "comanda_itens_insert" ON public.comanda_itens FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comanda_itens_update' AND tablename = 'comanda_itens') THEN
    CREATE POLICY "comanda_itens_update" ON public.comanda_itens FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comanda_itens_delete' AND tablename = 'comanda_itens') THEN
    CREATE POLICY "comanda_itens_delete" ON public.comanda_itens FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'caixa_select' AND tablename = 'caixa') THEN
    CREATE POLICY "caixa_select" ON public.caixa FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'caixa_insert' AND tablename = 'caixa') THEN
    CREATE POLICY "caixa_insert" ON public.caixa FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clientes_select' AND tablename = 'clientes') THEN
    CREATE POLICY "clientes_select" ON public.clientes FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clientes_insert' AND tablename = 'clientes') THEN
    CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clientes_update' AND tablename = 'clientes') THEN
    CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Criar profiles para usuarios existentes (criados antes do trigger)
INSERT INTO public.profiles (id, nome, email, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1)),
  email,
  'admin'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
