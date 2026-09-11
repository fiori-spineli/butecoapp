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

Nenhum e-mail sai da máquina: o Mailpit captura tudo em http://127.0.0.1:54324
— é lá que você abre o link de definir senha de uma conta recém-criada.

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
5. Em **Authentication → Sign In / Providers**, deixe **`Confirm email` ligado**
   e **desligue `Allow new users to sign up`**. Não existe mais auto-cadastro: a
   conta de um bar nasce no painel de admin, e a API de administração (que é o
   que o painel usa) ignora essa trava. Desligar aqui fecha a porta para quem
   tentar criar conta chamando a API de auth por fora do app.

   Ainda em **Providers**, ligue o **Google** (Client ID e Secret do Google
   Cloud Console; a *Authorized redirect URI* é a que o próprio Supabase mostra
   na tela). Enquanto ele estiver desligado, o botão "Entrar com Google"
   simplesmente não aparece na tela de login — ver `lib/provedores.ts`.

   E em **Authentication → Attack Protection**, ligue o **CAPTCHA** com provider
   **Turnstile**, usando a mesma chave secreta do `.env.local`. É isso que
   protege o endpoint de auth em si, e não só o formulário do app.
6. Em **Authentication → Emails**, ajuste o template de *Reset Password* para
   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`. Esse é o
   template mais importante do sistema hoje: além de atender quem esqueceu a
   senha, é por ele que o dono de um bar recém-criado define a **primeira**
   senha. O `{{ .RedirectTo }}` faz o link apontar direto para o app em vez de
   passar pelo `/auth/v1/verify` do Supabase — que é onde o scanner de link de
   alguns provedores de e-mail gasta o token de uso único antes da pessoa
   clicar. O Supabase só libera a edição de template com SMTP próprio
   configurado (Authentication → Emails → SMTP).

   O `supabase/templates/magic_link.html` continua versionado, mas o app não
   envia mais magic link — o login é senha ou Google.

```bash
npm install
npm run dev
```

Abra http://localhost:3000 — a primeira tela é a **vitrine**, que explica o
sistema para quem chegou de fora. O login mora discreto no canto, e quem ainda
não tem conta cai em `/contato`.

## Estrutura

```
app/
  page.tsx               # vitrine pública ("sobre o sistema") ou roteamento de quem já entrou
  contato/               # pedido de acesso — a única porta de bar novo
  (auth)/login/          # e-mail e senha, ou Google
  onboarding/            # conta sem bar: beco sem saída, não formulário
  (admin)/admin/         # backoffice: telemetria + fila de interessados
  (dashboard)/           # área autenticada do dono
    dashboard/           # resumo do dia + lista de comandas
    comanda/nova/        # abrir comanda
    comanda/[id]/        # lançar itens, dividir, fechar, mostrar QR
    produtos/            # catálogo + cadastro com foto
    fechamento/          # retrato do que está aberto, para imprimir ou salvar em PDF
  c/[token]/             # página pública do cliente (sem login)
  api/comanda/[token]/   # a mesma comanda em JSON, para a atualização ao vivo dessa página
  auth/callback/         # destino dos links de e-mail e do Google
  api/produtos/imagem/   # normaliza a foto para .webp e sobe pro Storage
  api/fechamento/csv/    # backup do movimento do dia em planilha
  actions/               # server actions (auth, bar, comandas, produtos, interesse)
  error.tsx / not-found.tsx  # erro inesperado e 404 com a cara do app
  manifest.ts            # PWA — instalável na tela inicial do celular
components/              # UI compartilhada (modais, miniatura, tab bar)
lib/                     # supabase, formatação de dinheiro/data, tipos, CSP
supabase/
  config.toml            # stack local (portas, auth, rate limit)
  migrations/            # schema versionado
  templates/             # template dos e-mails de autenticação
proxy.ts                 # renovação de sessão + CSP com nonce (era "middleware" antes do Next 16)
next.config.ts           # cabeçalhos fixos de segurança
```

## Decisões que valem saber

- **Dinheiro é inteiro em centavos**, nunca ponto flutuante.
- **Datas em UTC no banco**, convertidas para `America/Sao_Paulo` só na exibição.
- **O cliente anônimo não tem SELECT em tabela nenhuma.** A página pública passa
  pela função `comanda_publica(token)` — assim ninguém consegue listar as
  comandas abertas de todos os bares só por ter a chave anônima. A atualização
  ao vivo dessa página busca `/api/comanda/[token]` a cada 5 s enquanto a aba
  está visível (nada com a aba escondida; busca imediata ao voltar). O
  navegador nunca fala com o Supabase direto — é o que a CSP exige.
- **Preço vem sempre do catálogo no banco**, nunca do que o navegador mandou.
- **A sessão do dono é `httpOnly`.** Nenhum componente cliente lê a sessão, e a
  mesma origem serve a página pública `/c/[token]` — deixar o token legível por
  JavaScript transformaria qualquer XSS futuro ali em tomada de conta.
- **Não existe auto-cadastro.** Bar novo nasce no painel de admin, feito por
  gente, a partir de um pedido em `/contato`. É a defesa estrutural contra robô
  de cadastro em massa: não adianta furar validação se não há formulário que
  crie conta. O que o visitante consegue é entrar numa fila.
- **O pedido de contato tem quatro camadas**, da mais barata para a mais cara:
  campo-armadilha invisível (`lib/armadilha.ts`), Turnstile, validação de
  telefone e de e-mail descartável (~121 mil domínios,
  `lib/email-descartavel.ts`) e teto de 3 pedidos por IP por dia, conferido
  dentro do banco. Armadilha preenchida responde **o mesmo texto de sucesso** e
  não grava nada: dizer "você é um robô" ensina quem escreveu o robô a
  consertá-lo.
- **A função que grava o pedido só é executável pelo `service_role`.** A chave
  anônima é pública — tudo que `anon` executa, um robô também executa direto na
  API. Com o grant restrito, o único caminho é a server action, que já conferiu
  o Turnstile antes.
- **O 2FA do painel vale no banco, não só na tela.** A tela pedia o código, mas
  as server actions e as funções do Postgres atrás dela conferiam apenas se o
  `user_id` estava em `administradores`. Quem tivesse a senha do admin — e só a
  senha — lia tudo pela API. Agora `eh_admin()` exige `aal2` (a sessão passou
  pelo segundo fator) e o painel não busca dado nenhum antes disso: o HTML que
  vai para quem não validou o código vem vazio.
- **Links de e-mail usam fluxo `implicit`; o Google usa `pkce`.** O link do
  e-mail pode ser aberto em outro navegador (o iOS abre no navegador padrão do
  aparelho); o login social começa e termina no mesmo. Ver `lib/supabase/server.ts`.
- **Senha só se cadastra ou troca por link no e-mail.** Nem a tela de perfil
  grava senha direto: quem muda a senha é quem tem a caixa postal, não quem
  está com o celular do balcão na mão.
- **Divisão de conta é registro contábil, não pagamento.** Nenhum valor passa
  pelo app; o dinheiro é acertado fora dele.
- **Fechar a conta registra o acerto do que faltava.** Sem isso a comanda
  contava duas histórias: o cliente saía com o comprovante do total e o
  "Recebido hoje" do dono só somava o que tinha sido lançado à mão.
- **A foto do produto aceita câmera ou galeria** (input sem `capture`), é
  convertida para WebP no navegador e reprocessada com `sharp` no servidor —
  com teto de 6 MB, 30 megapixels e 400 arquivos por bar. Foto salva apaga a
  anterior; a que sobrou de formulário abandonado sai pelo botão "Limpar fotos
  sem produto" do painel de admin.
- **As regras da comanda valem no banco** (migration 0013): pagamento só em
  comanda aberta e nunca além do total; item não sai se já está coberto por
  pagamento; comanda fechada não muda. As server actions conferem antes para
  dar mensagem boa, mas quem garante é o trigger — ele roda em toda escrita,
  venha de onde vier, e tranca a linha da comanda para dois toques ao mesmo
  tempo entrarem um depois do outro.
- **Toda resposta sai com Content-Security-Policy de nonce** (`lib/csp.ts`,
  aplicada em `proxy.ts`). Só roda script com o nonce daquela resposta; o Next
  carimba os dele sozinho, e o único inline nosso (registro do service worker)
  recebe o nonce no layout. Isso obriga todas as páginas a renderizar por
  requisição — é o custo, e é pequeno. Turnstile, Analytics e Speed Insights
  entram por `'strict-dynamic'`. Os cabeçalhos fixos (nosniff, Referrer-Policy,
  Permissions-Policy, X-Frame-Options) ficam em `next.config.ts`.

## Deploy

A produção roda na Vercel, com build automático a cada push na `master`. As
variáveis `NEXT_PUBLIC_*` precisam ser do tipo **Config**, não *Secret*: elas são
congeladas no build, e *Secret* só existe em runtime — o build sairia sem elas.

Além das três originais, precisam estar lá: `SUPABASE_SERVICE_ROLE_KEY` (sem a
qual o painel não cria contas e o formulário de contato não grava),
`IP_HASH_SALT`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`. Ver
`.env.example` para o que cada uma faz. Depois do deploy, a URL de produção tem que estar na
allow list do Supabase (**Authentication → URL Configuration**), senão o magic
link cai no `Site URL` padrão.

## Scripts

```bash
npm run dev     # desenvolvimento
npm run build   # build de produção
npm start       # servir o build
npm run lint    # eslint
```
