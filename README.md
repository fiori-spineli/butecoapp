# Buteco

O caderninho de contas do boteco, no celular. O dono lança o consumo; o cliente
acompanha a própria conta por um link/QR, sem instalar nada e sem criar conta.

- **Documento de arquitetura:** `BotecoApp - Arquitetura Tecnica.docx`
- **Diagramas e wireframes:** `docs/LINKS.md`

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend + backend | Next.js 16 (App Router, Turbopack) + React 19 |
| Estilo | Tailwind CSS v4 |
| Banco, auth e storage | Supabase (PostgreSQL + RLS) |
| QR Code | `qrcode.react` (gerado no navegador) |
| Imagem | `browser-image-compression` (WebP no cliente) + `sharp` (normalização no servidor) |

## Como rodar

### 1. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (free tier serve).
2. Abra **SQL Editor** e rode, em ordem, os arquivos de `supabase/migrations/`:
   `0001_init.sql` (tabelas, RLS, função de acesso público, bucket de imagens) e
   `0002_hardening.sql` (correções apontadas pelos advisors).
3. Em **Project Settings → API**, copie a *Project URL* e a *anon public key*.

### 2. Configurar o app

```bash
cp .env.example .env.local   # preencha URL + anon key
npm install
npm run dev
```

Abra http://localhost:3000 — a primeira tela pede o e-mail e envia o magic link.
No painel do Supabase, em **Authentication → URL Configuration**, adicione
`http://localhost:3000/auth/callback` (e a URL de produção) como *Redirect URL*.

## Estrutura

```
app/
  (auth)/login/          # entrada por magic link
  (dashboard)/           # área autenticada do dono
    dashboard/           # resumo do dia + lista de comandas
    comanda/nova/        # abrir comanda
    comanda/[id]/        # lançar itens, dividir, fechar, mostrar QR
    produtos/            # catálogo + cadastro com foto
  c/[token]/             # página pública do cliente (sem login)
  api/produtos/imagem/   # normaliza a foto para .webp e sobe pro Storage
  actions/               # server actions (auth, bar, comandas, produtos)
components/              # UI compartilhada (modais, miniatura, tab bar)
lib/                     # supabase, formatação de dinheiro/data, tipos
supabase/migrations/     # schema versionado
proxy.ts                 # renovação de sessão (era "middleware" antes do Next 16)
```

## Decisões que valem saber

- **Dinheiro é inteiro em centavos**, nunca ponto flutuante.
- **Datas em UTC no banco**, convertidas para `America/Sao_Paulo` só na exibição.
- **O cliente anônimo não tem SELECT em tabela nenhuma.** A página pública passa
  pela função `comanda_publica(token)` — assim ninguém consegue listar as
  comandas abertas de todos os bares só por ter a chave anônima.
- **Divisão de conta é registro contábil, não pagamento.** Nenhum valor passa
  pelo app; o dinheiro é acertado fora dele.
- **A foto do produto aceita câmera ou galeria** (input sem `capture`), é
  convertida para WebP no navegador e reprocessada com `sharp` no servidor.

## Scripts

```bash
npm run dev     # desenvolvimento
npm run build   # build de produção
npm start       # servir o build
npx eslint .    # lint
```
