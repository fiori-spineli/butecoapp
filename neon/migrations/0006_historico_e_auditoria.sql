-- 0006: the sale keeps its own name, recovery knows invite from code, and
-- sensitive actions leave a trail. Additive and safe to rerun.

-- 1. History. A lancamento kept its price but read its NAME from the live product:
-- renaming the product rewrote old sales, and deleting it (FK ON DELETE SET NULL)
-- turned them into "Item". The name now travels with the sale, like the price.
CREATE OR REPLACE FUNCTION app_private.check_lancamento_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, app_private, pg_catalog AS $$
DECLARE v_status text; v_bar uuid; v_nome text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Edite o item removendo e lançando novamente.' USING ERRCODE = '23514';
  END IF;
  SELECT status, bar_id INTO v_status, v_bar FROM public.clientes
   WHERE id = NEW.cliente_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comanda não encontrada.' USING ERRCODE = 'P0002'; END IF;
  IF v_status <> 'aberta' THEN
    RAISE EXCEPTION 'A comanda está fechada.' USING ERRCODE = '23514';
  END IF;
  IF NEW.produto_id IS NOT NULL THEN
    SELECT nome INTO v_nome FROM public.produtos WHERE id = NEW.produto_id AND bar_id = v_bar;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto de outro bar.' USING ERRCODE = '23514';
    END IF;
    NEW.descricao := COALESCE(NEW.descricao, v_nome);
  END IF;
  RETURN NEW;
END $$;

-- Backfill rows written before this migration. The write trigger refuses UPDATE
-- on purpose, so it is switched off for this statement only, inside the
-- migration's transaction.
ALTER TABLE public.lancamentos DISABLE TRIGGER neon_lancamento_write;
UPDATE public.lancamentos l SET descricao = p.nome
  FROM public.produtos p
 WHERE l.produto_id = p.id AND l.descricao IS NULL;
ALTER TABLE public.lancamentos ENABLE TRIGGER neon_lancamento_write;

CREATE OR REPLACE VIEW public.relatorio_vendas_detalhado AS
SELECT l.id AS lancamento_id, c.bar_id, c.id AS comanda_id,
       c.nome AS comanda_nome, c.numero_mesa,
       COALESCE(l.descricao, pr.nome, 'Item avulso') AS nome_item,
       l.quantidade, l.valor_unitario_centavos,
       (l.quantidade::bigint * l.valor_unitario_centavos) AS total_centavos,
       l.created_at
  FROM public.lancamentos l
  JOIN public.clientes c ON c.id = l.cliente_id
  LEFT JOIN public.produtos pr ON pr.id = l.produto_id AND pr.bar_id = c.bar_id;

-- 2. Recovery. Invites (64 hex, from the admin) and e-mailed codes (8 digits)
-- share one row per user. Without a kind, asking for a code silently replaced a
-- pending invite, and five wrong 8-digit guesses locked the invite.
ALTER TABLE app_private.password_recovery
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'code';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_recovery_kind_check'
      AND conrelid = 'app_private.password_recovery'::regclass) THEN
    ALTER TABLE app_private.password_recovery ADD CONSTRAINT password_recovery_kind_check
      CHECK (kind IN ('code', 'invite'));
  END IF;
END $$;

-- 3. Audit trail: who did what to whom, when, and whether it worked. Ids and
-- outcomes only; no e-mails, names, tokens or amounts beyond what identifies
-- the action. Retention: two years, swept by the application.
CREATE TABLE IF NOT EXISTS app_private.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  action text NOT NULL CHECK (char_length(action) BETWEEN 1 AND 64),
  target_id uuid,
  ok boolean NOT NULL,
  detail text CHECK (detail IS NULL OR char_length(detail) <= 200),
  ip_hash text CHECK (ip_hash IS NULL OR char_length(ip_hash) <= 64)
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON app_private.audit_log(created_at);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON app_private.audit_log(target_id, created_at);
REVOKE ALL ON app_private.audit_log FROM PUBLIC;
