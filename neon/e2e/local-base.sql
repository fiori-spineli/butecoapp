-- Base local para neon/e2e/run.sh: modelos ORM que originaram o Neon (backend/app/models/orm_models.py,
-- removido no PR) + public.users do Supabase + colunas que o código do PR referencia.
-- NÃO é o esquema real do Neon; serve para provar que 0001..0005 aplicam e para exercitar a sessão.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, password_hash text, created_at timestamptz DEFAULT now());
CREATE TABLE public.bars (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nome varchar(120) NOT NULL, slug varchar(60) UNIQUE NOT NULL, mensagem_qr text, horario_abertura time DEFAULT '18:00', horario_fechamento time DEFAULT '03:00',
  telefone varchar(30), cidade varchar(120), foto_url text, created_at timestamptz DEFAULT now());
CREATE TABLE public.clientes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  nome varchar(80) NOT NULL, numero_mesa varchar(20), token uuid UNIQUE DEFAULT gen_random_uuid(), status varchar(20) DEFAULT 'aberta', fechada_em timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE public.produtos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  nome varchar(120) NOT NULL, preco_centavos integer NOT NULL, categoria varchar(30) DEFAULT 'outros', estoque_atual integer DEFAULT 0, imagem_url text, created_at timestamptz DEFAULT now());
CREATE TABLE public.lancamentos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL, descricao text, quantidade integer NOT NULL DEFAULT 1, valor_unitario_centavos integer NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE public.pagamentos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  lancamento_id uuid REFERENCES public.lancamentos(id) ON DELETE CASCADE, quantidade_paga integer, valor_centavos integer NOT NULL, descricao text, created_at timestamptz DEFAULT now());
CREATE TABLE public.pedidos_pendentes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE, produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 1, valor_unitario_centavos integer NOT NULL, status varchar(20) DEFAULT 'pendente', atendido_em timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE public.interessados (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome varchar(120) NOT NULL, bar_nome varchar(120) NOT NULL, email varchar(254) NOT NULL,
  telefone varchar(30) NOT NULL, cidade varchar(120), mensagem text, status varchar(20) DEFAULT 'novo', observacao text, ip_hash text, atendido_em timestamptz,
  bar_id uuid REFERENCES public.bars(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now());
CREATE TABLE public.administradores (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE NOT NULL, email varchar(254) NOT NULL, totp_secret varchar(64), created_at timestamptz DEFAULT now());
