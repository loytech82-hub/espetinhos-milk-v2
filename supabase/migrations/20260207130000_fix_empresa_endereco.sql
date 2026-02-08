-- =============================================
-- FIX: Criar tabela empresa + coluna endereco em clientes
-- =============================================

-- TABELA: empresa (dados do estabelecimento)
CREATE TABLE IF NOT EXISTS public.empresa (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT 'Meu Negocio',
  endereco TEXT,
  telefone TEXT,
  cnpj TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir registro padrao (id=1)
INSERT INTO public.empresa (id, nome)
VALUES (1, 'Espetinhos Milk')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;

-- Policies para empresa
CREATE POLICY "empresa_select" ON public.empresa
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "empresa_update" ON public.empresa
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- FIX: Adicionar coluna endereco na tabela clientes (se nao existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'endereco'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN endereco TEXT;
  END IF;
END $$;

-- Criar bucket de storage para empresa (logo)
-- Nota: buckets devem ser criados via dashboard ou API, nao via SQL
-- Mas podemos inserir na tabela de buckets diretamente
INSERT INTO storage.buckets (id, name, public)
VALUES ('empresa', 'empresa', true)
ON CONFLICT (id) DO NOTHING;
