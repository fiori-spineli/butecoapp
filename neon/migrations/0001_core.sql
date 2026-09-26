-- Neon: rules shared by the Next.js server and every database writer.
-- Additive and safe to rerun. Apply on a branch before production.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS app_private.mfa_factors (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  secret_ciphertext bytea NOT NULL,
  confirmed_at timestamptz,
  last_used_step bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_private.password_recovery (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  code_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_private.auth_rate_limits (
  key_hash bytea PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

REVOKE ALL ON ALL TABLES IN SCHEMA app_private FROM PUBLIC;

CREATE INDEX IF NOT EXISTS clientes_bar_status_created_idx
  ON public.clientes(bar_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS pedidos_bar_status_created_idx
  ON public.pedidos_pendentes(bar_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS interessados_status_created_idx
  ON public.interessados(status, created_at DESC);
CREATE INDEX IF NOT EXISTS pagamentos_cliente_lancamento_idx
  ON public.pagamentos(cliente_id, lancamento_id);

CREATE OR REPLACE VIEW public.comandas_resumo AS
SELECT c.id, c.bar_id, c.nome, c.numero_mesa, c.token, c.status,
       c.fechada_em, c.created_at,
       COALESCE(l.total_centavos, 0)::bigint AS total_centavos,
       COALESCE(p.pago_centavos, 0)::bigint AS pago_centavos,
       (COALESCE(l.total_centavos, 0) - COALESCE(p.pago_centavos, 0))::bigint AS restante_centavos,
       COALESCE(l.itens, 0)::bigint AS itens
  FROM public.clientes c
  LEFT JOIN LATERAL (
    SELECT SUM(quantidade::bigint * valor_unitario_centavos) AS total_centavos,
           COUNT(*) AS itens
      FROM public.lancamentos WHERE cliente_id = c.id
  ) l ON true
  LEFT JOIN LATERAL (
    SELECT SUM(valor_centavos)::bigint AS pago_centavos
      FROM public.pagamentos WHERE cliente_id = c.id
  ) p ON true;

CREATE OR REPLACE VIEW public.relatorio_vendas_detalhado AS
SELECT l.id AS lancamento_id, c.bar_id, c.id AS comanda_id,
       c.nome AS comanda_nome, c.numero_mesa,
       COALESCE(pr.nome, l.descricao, 'Item avulso') AS nome_item,
       l.quantidade, l.valor_unitario_centavos,
       (l.quantidade::bigint * l.valor_unitario_centavos) AS total_centavos,
       l.created_at
  FROM public.lancamentos l
  JOIN public.clientes c ON c.id = l.cliente_id
  LEFT JOIN public.produtos pr ON pr.id = l.produto_id AND pr.bar_id = c.bar_id;

-- A lock on clientes serializes all writes to a comanda before checking money.
CREATE OR REPLACE FUNCTION app_private.check_lancamento_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, app_private, pg_catalog AS $$
DECLARE v_status text; v_bar uuid;
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
  IF NEW.produto_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.produtos WHERE id = NEW.produto_id AND bar_id = v_bar
  ) THEN
    RAISE EXCEPTION 'Produto de outro bar.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION app_private.check_lancamento_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, app_private, pg_catalog AS $$
DECLARE v_status text; v_total bigint; v_paid bigint;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
  SELECT status INTO v_status FROM public.clientes WHERE id = OLD.cliente_id FOR UPDATE;
  IF NOT FOUND THEN RETURN OLD; END IF;
  IF v_status <> 'aberta' THEN
    RAISE EXCEPTION 'A comanda está fechada.' USING ERRCODE = '23514';
  END IF;
  SELECT COALESCE(SUM(quantidade::bigint * valor_unitario_centavos), 0)
    INTO v_total FROM public.lancamentos
   WHERE cliente_id = OLD.cliente_id AND id <> OLD.id;
  SELECT COALESCE(SUM(valor_centavos), 0)
    INTO v_paid FROM public.pagamentos WHERE cliente_id = OLD.cliente_id;
  IF v_paid > v_total THEN
    RAISE EXCEPTION 'Desfaça pagamentos antes de remover este item.' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION app_private.check_pagamento_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, app_private, pg_catalog AS $$
DECLARE v_status text; v_total bigint; v_paid bigint; v_item_quantity integer; v_item_paid bigint;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Edite o pagamento removendo e registrando novamente.' USING ERRCODE = '23514';
  END IF;
  SELECT status INTO v_status FROM public.clientes WHERE id = NEW.cliente_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comanda não encontrada.' USING ERRCODE = 'P0002'; END IF;
  IF v_status <> 'aberta' THEN
    RAISE EXCEPTION 'A comanda está fechada.' USING ERRCODE = '23514';
  END IF;
  IF NEW.lancamento_id IS NOT NULL THEN
    SELECT quantidade INTO v_item_quantity FROM public.lancamentos
     WHERE id = NEW.lancamento_id AND cliente_id = NEW.cliente_id;
    IF NOT FOUND OR NEW.quantidade_paga IS NULL THEN
      RAISE EXCEPTION 'Item inválido para este pagamento.' USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(SUM(quantidade_paga), 0) INTO v_item_paid
      FROM public.pagamentos WHERE lancamento_id = NEW.lancamento_id;
    IF v_item_paid + NEW.quantidade_paga > v_item_quantity THEN
      RAISE EXCEPTION 'Quantidade paga excede o item.' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.quantidade_paga IS NOT NULL THEN
    RAISE EXCEPTION 'Quantidade paga exige item.' USING ERRCODE = '23514';
  END IF;
  SELECT COALESCE(SUM(quantidade::bigint * valor_unitario_centavos), 0)
    INTO v_total FROM public.lancamentos WHERE cliente_id = NEW.cliente_id;
  SELECT COALESCE(SUM(valor_centavos), 0)
    INTO v_paid FROM public.pagamentos WHERE cliente_id = NEW.cliente_id;
  IF v_paid + NEW.valor_centavos > v_total THEN
    RAISE EXCEPTION 'Pagamento excede o saldo da comanda.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION app_private.check_pagamento_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, app_private, pg_catalog AS $$
DECLARE v_status text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
  SELECT status INTO v_status FROM public.clientes WHERE id = OLD.cliente_id FOR UPDATE;
  IF NOT FOUND THEN RETURN OLD; END IF;
  IF v_status <> 'aberta' THEN
    RAISE EXCEPTION 'A comanda está fechada.' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION app_private.check_cliente_close()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, app_private, pg_catalog AS $$
DECLARE v_balance bigint;
BEGIN
  IF NEW.status = 'fechada' AND OLD.status <> 'fechada' THEN
    SELECT COALESCE(SUM(quantidade::bigint * valor_unitario_centavos), 0)
      - (SELECT COALESCE(SUM(valor_centavos), 0) FROM public.pagamentos WHERE cliente_id = NEW.id)
      INTO v_balance FROM public.lancamentos WHERE cliente_id = NEW.id;
    IF v_balance <> 0 THEN
      RAISE EXCEPTION 'A comanda só pode ser fechada sem saldo.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM public.pedidos_pendentes WHERE cliente_id = NEW.id AND status = 'pendente') THEN
      RAISE EXCEPTION 'Resolva os pedidos pendentes antes de fechar.' USING ERRCODE = '23514';
    END IF;
    NEW.fechada_em := COALESCE(NEW.fechada_em, now());
  ELSIF NEW.status = 'aberta' THEN
    NEW.fechada_em := NULL;
  END IF;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'neon_lancamento_write' AND tgrelid = 'public.lancamentos'::regclass) THEN
    CREATE TRIGGER neon_lancamento_write BEFORE INSERT OR UPDATE ON public.lancamentos
      FOR EACH ROW EXECUTE FUNCTION app_private.check_lancamento_write();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'neon_lancamento_delete' AND tgrelid = 'public.lancamentos'::regclass) THEN
    CREATE TRIGGER neon_lancamento_delete BEFORE DELETE ON public.lancamentos
      FOR EACH ROW EXECUTE FUNCTION app_private.check_lancamento_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'neon_pagamento_write' AND tgrelid = 'public.pagamentos'::regclass) THEN
    CREATE TRIGGER neon_pagamento_write BEFORE INSERT OR UPDATE ON public.pagamentos
      FOR EACH ROW EXECUTE FUNCTION app_private.check_pagamento_write();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'neon_pagamento_delete' AND tgrelid = 'public.pagamentos'::regclass) THEN
    CREATE TRIGGER neon_pagamento_delete BEFORE DELETE ON public.pagamentos
      FOR EACH ROW EXECUTE FUNCTION app_private.check_pagamento_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'neon_cliente_close' AND tgrelid = 'public.clientes'::regclass) THEN
    CREATE TRIGGER neon_cliente_close BEFORE UPDATE OF status ON public.clientes
      FOR EACH ROW EXECUTE FUNCTION app_private.check_cliente_close();
  END IF;
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC;
