# ButecoApp

O caderninho de contas do buteco, no celular. O dono lança o consumo; o cliente
acompanha a própria conta por um link/QR, sem instalar nada e sem criar conta.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend + backend | Next.js 16 (App Router, Turbopack) + React 19 |
| Estilo | Tailwind CSS v4 |
| Banco, auth e storage | Supabase (PostgreSQL + RLS) |
| QR Code | `qrcode.react` (gerado no navegador) |
| Imagem | `browser-image-compression` (WebP no cliente) + `sharp` (normalização no servidor) |
| Hospedagem | Vercel |

## Como rodar

São dois caminhos. O **local** sobe um Supabase inteiro na sua máquina e é o
recomendado para desenvolver — assim nenhum teste encosta em dado de produção.
O **na nuvem** é o que a produção usa.

### Opção A — Supabase local (recomendado para dev)

Precisa do [Docker](https://docs.docker.com/desktop/) rodando e da
[CLI do Supabase](https://supabase.com/docs/guides/local-development).

```bash
npm install
npx supabase start   # sobe Postgres, Auth, Storage e Mailpit; aplica as migrations
```

O `supabase start` imprime a *API URL* e a *anon key* locais (`npx supabase status`
mostra de novo). Passe as duas para o `.env.local`:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key impressa pela CLI>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev
```

O e-mail do magic link **não sai da máquina**: o Mailpit captura tudo em
http://127.0.0.1:54324 — abra o link por lá para entrar.

Toda a configuração de auth já está versionada em `supabase/config.toml`
(`site_url`, a redirect URL do callback, o limite de e-mails) e em
`supabase/templates/magic_link.html`. Não há nada para ajustar à mão.

### Opção B — projeto na nuvem

1. Crie um projeto em [supabase.com](https://supabase.com) (free tier serve).
2. Abra **SQL Editor** e rode as migrations **na ordem**. O `0001_init.sql` é o
   schema base (tabelas, RLS, índices, função de acesso público, bucket de
   imagens e os grants já ajustados); da `0005` em diante vêm o painel
   administrativo, o relatório gerencial e as travas de cadastro.

   Os arquivos `0002`, `0003` e `0004` são **remendos históricos**, para bancos
   criados antes de cada correção — numa instalação nova eles não têm efeito
   algum, porque o `0001` já chega no estado final deles. As migrations `0005`,
   `0006` e `0007` são obrigatórias em qualquer instalação.

3. Em **Project Settings → API**, copie a *Project URL* e a *anon public key*
   para o `.env.local` (`cp .env.example .env.local`), e ponha em
   `NEXT_PUBLIC_SITE_URL` a URL pública do app.
4. Em **Authentication → URL Configuration**, cadastre como *Redirect URLs*
   tanto `http://localhost:3000/auth/callback` quanto a URL de produção.
5. Em **Authentication → Sign In / Providers**, deixe **`Confirm email` ligado**.
   O cadastro do dono depende disso: a conta só passa a valer quando a pessoa
   abre o link na própria caixa postal. Com a opção desligada, qualquer um cria
   conta com um endereço que não é dele.
6. Em **Authentication → Emails**, troque o template do *Magic Link* pelo
   conteúdo de `supabase/templates/magic_link.html`. O `{{ .RedirectTo }}` faz
   o link apontar direto para o app em vez de passar pelo `/auth/v1/verify` do
   Supabase — que é onde o scanner de link de alguns provedores de e-mail gasta
   o token de uso único antes da pessoa clicar. O Supabase só libera a edição de
   template com SMTP próprio configurado (Authentication → Emails → SMTP).

```bash
npm install
npm run dev
```

Abra http://localhost:3000 — a primeira tela pede o e-mail e envia o magic link.

## Estrutura

```
app/
  (auth)/login/          # entrada por magic link
  onboarding/            # cadastro do bar no primeiro acesso
  (dashboard)/           # área autenticada do dono
    dashboard/           # resumo do dia + lista de comandas
    comanda/nova/        # abrir comanda
    comanda/[id]/        # lançar itens, dividir, fechar, mostrar QR
    produtos/            # catálogo + cadastro com foto
  c/[token]/             # página pública do cliente (sem login)
  auth/callback/         # destino do magic link (troca o token pela sessão)
  api/produtos/imagem/   # normaliza a foto para .webp e sobe pro Storage
  actions/               # server actions (auth, bar, comandas, produtos)
  manifest.ts            # PWA — instalável na tela inicial do celular
components/              # UI compartilhada (modais, miniatura, tab bar)
lib/                     # supabase, formatação de dinheiro/data, tipos
supabase/
  config.toml            # stack local (portas, auth, rate limit)
  migrations/            # schema versionado
  templates/             # template do e-mail de magic link
proxy.ts                 # renovação de sessão (era "middleware" antes do Next 16)
```

## Decisões que valem saber

- **Dinheiro é inteiro em centavos**, nunca ponto flutuante.
- **Datas em UTC no banco**, convertidas para `America/Sao_Paulo` só na exibição.
- **O cliente anônimo não tem SELECT em tabela nenhuma.** A página pública passa
  pela função `comanda_publica(token)` — assim ninguém consegue listar as
  comandas abertas de todos os bares só por ter a chave anônima.
- **Preço vem sempre do catálogo no banco**, nunca do que o navegador mandou.
- **A sessão do dono é `httpOnly`.** Nenhum componente cliente lê a sessão, e a
  mesma origem serve a página pública `/c/[token]` — deixar o token legível por
  JavaScript transformaria qualquer XSS futuro ali em tomada de conta.
- **Criar conta passa por três travas**: formato do endereço, lista de e-mails
  descartáveis (~121 mil domínios, `lib/email-descartavel.ts`) e um cadastro por
  IP. A conta só existe de fato depois que a pessoa abre o link de confirmação.
- **Senha só se cadastra ou troca por link no e-mail.** Nem a tela de perfil
  grava senha direto: quem muda a senha é quem tem a caixa postal, não quem
  está com o celular do balcão na mão.
- **Divisão de conta é registro contábil, não pagamento.** Nenhum valor passa
  pelo app; o dinheiro é acertado fora dele.
- **Fechar a conta registra o acerto do que faltava.** Sem isso a comanda
  contava duas histórias: o cliente saía com o comprovante do total e o
  "Recebido hoje" do dono só somava o que tinha sido lançado à mão.
- **A foto do produto aceita câmera ou galeria** (input sem `capture`), é
  convertida para WebP no navegador e reprocessada com `sharp` no servidor.

## Deploy

A produção roda na Vercel, com build automático a cada push na `master`. As três
variáveis de ambiente precisam ser do tipo **Config**, não *Secret*: as
`NEXT_PUBLIC_*` são congeladas no build, e *Secret* só existe em runtime — o
build sairia sem elas. Depois do deploy, a URL de produção tem que estar na
allow list do Supabase (**Authentication → URL Configuration**), senão o magic
link cai no `Site URL` padrão.

## Scripts

```bash
npm run dev     # desenvolvimento
npm run build   # build de produção
npm start       # servir o build
npm run lint    # eslint
```
