-- Baseline do esquema `public` do Neon — o que as migrations 0001+ pressupõem.
--
-- POR QUE EXISTE: a 0001 começa com ALTER TABLE public.users e cria views sobre
-- bars/clientes/lancamentos; nenhuma migration cria essas tabelas. Sem este
-- arquivo, o banco não se reconstruía a partir do repositório, e os testes
-- rodavam sobre um esquema inventado (o antigo neon/e2e/local-base.sql, sem os
-- CHECKs, as FKs compostas e a coluna `acessibilidade` que a produção tem).
--
-- DE ONDE VEIO: extraído do catálogo do Neon de produção em 2026-10-07
-- (pg_attribute, pg_constraint, pg_indexes) — leitura, sem dado nenhum.
-- O que as migrations 0001..0006 criam ou alteram NÃO está aqui; elas
-- continuam idempotentes e são aplicadas por cima (neon/migrate.mjs).
--
-- USO: banco vazio → este arquivo → `node neon/migrate.mjs`. Nunca rodar num
-- banco que já tem as tabelas. Não é registrado em schema_migrations.
--
-- CONFERÊNCIA: depois de mudar o esquema de produção por fora das migrations
-- (não deveria acontecer), regerar e comparar com `compare_database_schema`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CONSTRAINT users_email_key UNIQUE,
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.administradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL CONSTRAINT administradores_user_id_key UNIQUE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nome text NOT NULL CONSTRAINT bars_nome_check CHECK (char_length(nome) >= 1 AND char_length(nome) <= 120),
  slug text NOT NULL CONSTRAINT bars_slug_key UNIQUE
    CONSTRAINT bars_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  mensagem_qr text CONSTRAINT bars_mensagem_qr_check CHECK (mensagem_qr IS NULL OR char_length(mensagem_qr) <= 300),
  horario_abertura time NOT NULL DEFAULT '18:00:00',
  horario_fechamento time NOT NULL DEFAULT '03:00:00',
  telefone text CONSTRAINT bars_telefone_check CHECK (telefone IS NULL OR char_length(telefone) <= 30),
  cidade text CONSTRAINT bars_cidade_check CHECK (cidade IS NULL OR char_length(cidade) <= 120),
  foto_url text,
  acessibilidade jsonb DEFAULT '{"tamanho_fonte": "padrao", "alto_contraste": false, "modo_daltonico": "nenhum"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bars_owner_id_idx ON public.bars (owner_id);

CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  nome text NOT NULL CONSTRAINT clientes_nome_check CHECK (char_length(nome) >= 1 AND char_length(nome) <= 80),
  numero_mesa text CONSTRAINT clientes_numero_mesa_check CHECK (numero_mesa IS NULL OR char_length(numero_mesa) <= 20),
  token uuid NOT NULL DEFAULT gen_random_uuid() CONSTRAINT clientes_token_key UNIQUE,
  status text NOT NULL DEFAULT 'aberta' CONSTRAINT clientes_status_check CHECK (status IN ('aberta', 'fechada')),
  fechada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clientes_id_bar_id_key UNIQUE (id, bar_id)
);
CREATE INDEX clientes_bar_id_idx ON public.clientes (bar_id);
CREATE INDEX clientes_token_idx ON public.clientes (token);

CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  nome text NOT NULL CONSTRAINT produtos_nome_check CHECK (char_length(nome) >= 1 AND char_length(nome) <= 120),
  preco_centavos integer NOT NULL
    CONSTRAINT produtos_preco_centavos_check CHECK (preco_centavos > 0 AND preco_centavos <= 10000000),
  categoria text NOT NULL DEFAULT 'outros' CONSTRAINT produtos_categoria_check
    CHECK (categoria IN ('comida', 'bebida', 'entretenimento', 'servico', 'outros')),
  estoque_atual integer NOT NULL DEFAULT 0 CONSTRAINT produtos_estoque_atual_check CHECK (estoque_atual >= 0),
  imagem_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT produtos_id_bar_id_key UNIQUE (id, bar_id)
);
CREATE INDEX produtos_bar_id_idx ON public.produtos (bar_id);

CREATE TABLE public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  descricao text CONSTRAINT lancamentos_descricao_check CHECK (descricao IS NULL OR char_length(descricao) <= 120),
  quantidade integer NOT NULL DEFAULT 1
    CONSTRAINT lancamentos_quantidade_check CHECK (quantidade > 0 AND quantidade <= 999),
  valor_unitario_centavos integer NOT NULL CONSTRAINT lancamentos_valor_unitario_centavos_check
    CHECK (valor_unitario_centavos > 0 AND valor_unitario_centavos <= 10000000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lancamentos_cliente_idx ON public.lancamentos (cliente_id);
CREATE INDEX lancamentos_produto_idx ON public.lancamentos (produto_id);

CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  lancamento_id uuid REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  quantidade_paga integer CONSTRAINT pagamentos_quantidade_paga_check CHECK (quantidade_paga > 0),
  valor_centavos integer NOT NULL
    CONSTRAINT pagamentos_valor_centavos_check CHECK (valor_centavos > 0 AND valor_centavos <= 100000000),
  descricao text CONSTRAINT pagamentos_descricao_check CHECK (descricao IS NULL OR char_length(descricao) <= 120),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pagamentos_cliente_idx ON public.pagamentos (cliente_id);
CREATE INDEX pagamentos_lancto_idx ON public.pagamentos (lancamento_id);

CREATE TABLE public.pedidos_pendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  quantidade integer NOT NULL DEFAULT 1
    CONSTRAINT pedidos_pendentes_quantidade_check CHECK (quantidade > 0 AND quantidade <= 99),
  valor_unitario_centavos integer NOT NULL
    CONSTRAINT pedidos_pendentes_valor_unitario_centavos_check CHECK (valor_unitario_centavos > 0),
  status text NOT NULL DEFAULT 'pendente' CONSTRAINT pedidos_pendentes_status_check
    CHECK (status IN ('pendente', 'entregue', 'cancelado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  atendido_em timestamptz,
  CONSTRAINT pedidos_pendentes_cliente_do_mesmo_bar FOREIGN KEY (cliente_id, bar_id)
    REFERENCES public.clientes(id, bar_id) ON DELETE CASCADE,
  CONSTRAINT pedidos_pendentes_produto_do_mesmo_bar FOREIGN KEY (produto_id, bar_id)
    REFERENCES public.produtos(id, bar_id) ON DELETE CASCADE
);
CREATE INDEX pedidos_pendentes_cliente_bar_idx ON public.pedidos_pendentes (cliente_id, bar_id, status);
CREATE INDEX pedidos_pendentes_produto_bar_idx ON public.pedidos_pendentes (produto_id, bar_id);

CREATE TABLE public.interessados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  bar_nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  cidade text,
  mensagem text,
  ip_hash text,
  status text NOT NULL DEFAULT 'novo' CONSTRAINT interessados_status_check
    CHECK (status IN ('novo', 'contatado', 'convertido', 'descartado')),
  observacao text,
  atendido_em timestamptz,
  bar_id uuid REFERENCES public.bars(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX interessados_bar_idx ON public.interessados (bar_id);
CREATE INDEX interessados_ip_idx ON public.interessados (ip_hash, created_at DESC);
CREATE INDEX interessados_status_idx ON public.interessados (status, created_at DESC);
