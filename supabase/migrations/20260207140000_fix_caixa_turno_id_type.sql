-- =============================================
-- FIX: turno_id na tabela caixa é UUID mas deveria ser INTEGER
-- caixa_turnos.id é SERIAL (integer), então turno_id precisa ser integer
-- =============================================

-- Remover constraint de FK se existir (nome pode variar)
DO $$
BEGIN
  -- Tentar dropar qualquer FK que referencia caixa_turnos
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'caixa' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%turno%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.caixa DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'caixa' AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%turno%'
      LIMIT 1
    );
  END IF;
END $$;

-- Alterar tipo da coluna (todos valores são null, então é seguro)
ALTER TABLE public.caixa ALTER COLUMN turno_id DROP DEFAULT;
ALTER TABLE public.caixa ALTER COLUMN turno_id TYPE INTEGER USING NULL;

-- Recriar FK corretamente
ALTER TABLE public.caixa
  ADD CONSTRAINT caixa_turno_id_fkey
  FOREIGN KEY (turno_id) REFERENCES public.caixa_turnos(id);
