# Guard rails do ButecoApp

Este arquivo é lido no início de toda sessão (ver `CLAUDE.md`). **Cada regra
aqui nasceu de um erro real que chegou a produção neste projeto** — não é teoria
nem boa prática genérica. Antes de escrever código que toque em exclusão,
autenticação, autorização, dinheiro ou política de plataforma, leia a seção
correspondente.

Três pilares, nesta ordem, sempre: **mapeado** (existe registro de por quê),
**mantenível** (o próximo a mexer entende sem arqueologia), **evolutivo** (a
mudança seguinte não precisa desfazer esta).

---

## 1. Nada apaga com base numa leitura que pode vir vazia por engano

**Incidente — 2026-09-11, corrigido no commit `2bc6f0e`.** A trava do "Entrar
com Google" perguntava "esse usuário tem bar ou é admin?" usando a ótica RLS do
próprio usuário, logo depois de `exchangeCodeForSession`. As políticas de `bars`
e `administradores` exigem o papel `authenticated` e `auth.uid()`; naquele
instante o token da sessão nova ainda não tinha sido aplicado ao cliente, então
a consulta voltava **vazia para todo mundo**. Um dono legítimo virava "estranho":
recusado e **apagado**, levando o bar e todas as comandas por cascata. Custou a
conta de teste e o bar inteiro dela.

**Regras:**

- Exclusão exige **prova positiva**. "Não encontrei" nunca é prova de "não
  existe" — pode ser permissão, timing, rede ou filtro errado.
- Decisão de **segurança/autorização nunca depende de leitura sob RLS feita com
  uma sessão recém-criada**. Para responder com autoridade, use a chave de
  serviço (`createSupabaseAdminClient`), que não depende de cookie nem de timing.
- Em erro, exceção ou dúvida: **recusar o acesso, nunca destruir**. Recusa a
  pessoa refaz; exclusão é irreversível (plano free não tem PITR).
- Antes de escrever qualquer caminho que apague, **mapeie o raio da cascata** e
  escreva-o no comentário.

**Raio de cascata atual (confirmado em 2026-09-11):**

```
auth.users  --ON DELETE CASCADE-->  bars
bars        --ON DELETE CASCADE-->  clientes, produtos
clientes    --ON DELETE CASCADE-->  lancamentos, pagamentos
lancamentos --ON DELETE CASCADE-->  pagamentos
bars        --ON DELETE SET NULL->  interessados.bar_id
```

Ou seja: **um `auth.admin.deleteUser()` apaga um cliente inteiro.** Storage não
entra na cascata — as fotos viram órfãs e precisam ser removidas à parte.

---

## 2. Verificar no caminho real, nunca num análogo

**Incidentes:** (a) 2026-09-07 — cookie `httpOnly` conferido pelo cookie do PKCE
(escrito por uma server action) em vez do cookie da sessão (escrito pelo route
handler, outro contexto de escrita). O token do dono seguia legível.
(b) 2026-09-11 — a página do cliente foi testada por 2 s procurando erro de CSP,
mas ela só atualizava a cada 8 s: o teste não esperou um ciclo e não verificou
que o dado tinha chegado.

**Regras:**

- Exercitar **o caminho que de fato importa**, não um parecido.
- Teste de comportamento periódico espera **pelo menos um período inteiro** e
  prova que **a atualização chegou** — ausência de erro não é prova de sucesso.
- Falha engolida (`if (error) return`) não aparece em listener de erro nem no
  console. Para achar, olhe a rede, não o console.
- Se não der para exercitar agora, dizer **"verificação pendente"** — nunca
  arredondar para "corrigido".

---

## 3. Política de plataforma quebra o que ninguém lembrou que existia

**Incidente — 2026-09-11, commit `547a80c`.** A CSP com `connect-src 'self'`
matou em silêncio a atualização ao vivo da comanda do cliente, que chamava a API
do Supabase direto do navegador. A busca por `createBrowserClient` não achou,
porque o arquivo usava outro nome (`lib/supabase/publico.ts`).

**Regras:**

- Ao apertar CSP, cabeçalhos, `proxy.ts` ou qualquer regra global: **enumere
  todas as chamadas que saem do navegador** procurando por `fetch(`,
  `createClient(` e imports de `@supabase` em arquivos `"use client"` — nunca
  por um nome de arquivo.
- Depois, percorra **cada tela** em build de produção, com um ciclo completo.
- Preferir **manter a regra e adaptar o código** (rota própria no nosso domínio)
  a afrouxar a política.

---

## 4. Painel web não é fonte de dado

**Incidente — 2026-09-08.** Li a **ilustração de exemplo** da tela de API Keys do
Supabase como se fossem as chaves do projeto e editei o `.env.local` do usuário
com um valor que era só texto de exemplo.

**Regra:** dado de configuração se confirma por **API/CLI/banco**, não por
captura de tela. Esperar a lista real carregar; conferir o valor pela fonte.

---

## 5. Regra de dinheiro mora no banco

**Incidente — encontrado em produção, migration `0013`.** As regras da comanda
viviam só nas server actions. Resultado real: comanda **fechada** com saldo
−R$ 4,75 (item removido depois do acerto). Duas requisições simultâneas também
passavam as duas na checagem.

**Regras:**

- Invariante de dinheiro é **constraint/trigger**, não validação de request.
- Concorrência em saldo: `SELECT … FOR UPDATE` na linha da comanda.
- A action continua validando — mas para dar **mensagem boa**, não para ser a
  garantia.

---

## 6. Autorização se aplica no servidor e no banco, nunca escondendo a tela

**Incidente — migration `0011`.** O painel mostrava o cadeado do 2FA, mas as
server actions e as funções do Postgres atrás dele só conferiam a tabela
`administradores`. Quem tivesse a senha do admin lia tudo por POST, sem passar
pelo autenticador. Pior: o painel é SSR e mandava os dados no HTML **antes** da
tela do 2FA.

**Regras:**

- Esconder na interface não é controle de acesso.
- Página SSR **não busca dado nenhum** antes de o gate passar.
- O banco também exige (`eh_admin()` com `aal2`), porque a API pode ser chamada
  por fora do app.
- `aal2` não vence sozinho: ver `lib/mfa-frescor.ts` (janela de revalidação).

---

## 7. Permissão é explícita; `revoke` faz parte da migration

**Incidentes:** `registrar_cadastro_do_ip` continuou executável por `anon`
(respondia **204** em produção — escrita anônima sem teto); `registrar_interesse`
continuou executável por `authenticated` por grant padrão.

**Regra:** toda função nova declara quem executa, com `revoke` explícito de
`anon`/`authenticated` quando ela não é para eles. Conferir com
`get_advisors(security)` depois de mexer no schema.

---

## 8. `git add -A` varre tudo que estiver na pasta

**Incidente:** gravações de tela do celular do dono entraram num commit de repo
**público**.

**Regras:**

- Conferir `git status` **antes** de todo commit.
- Arquivo que não é do projeto (relatório, gravação, credencial) vai para
  `.gitignore` ou `.git/info/exclude` **antes** de existir na pasta.
- Repositório é público: remover do topo não basta, o histórico segue servindo.

---

## 9. O app abre como página estática abre

**Pedido do dono, 2026-09-11:** "tem que continuar rápido, como se fosse um
arquivo HTML único: a pessoa clica e já reflete". É requisito, não desejo.

**Regras:**

- Nada que o usuário espera pode depender de ida ao servidor quando a resposta
  já está no aparelho. Tema é o exemplo: fica em `localStorage` e é aplicado por
  script síncrono **antes da primeira pintura** (`lib/tema.ts`) — guardar no
  banco custaria uma espera antes de pintar.
- Atualização automática roda **só com a aba à vista**, e busca na hora em que
  ela volta (`components/atualizacao-ao-vivo.tsx`, `app/c/[token]`). Aba em
  segundo plano não gasta rede, bateria nem servidor.
- Para refazer dados, `router.refresh()` — nunca `location.reload()`: o
  primeiro troca só a parte servidora e preserva modal aberto, texto digitado e
  rolagem; o segundo joga fora o que a pessoa estava fazendo.
- Funcionalidade nova não pode introduzir piscada nem pulo de layout. Se
  introduziu, o conserto faz parte da mesma entrega.

---

## 10. Controle não muda de lugar entre telas

**Incidente — 2026-09-11.** As três telas do dono montavam cada uma o seu
cabeçalho, e o lado direito variava (Perfil e Sair numa, botão de novo produto
noutra, nada na terceira). Como o cabeçalho distribuía o espaço entre as pontas,
a navegação caía num x diferente em cada tela: trocar de aba movia os próprios
botões debaixo do dedo.

**Regras:**

- Controle que existe em várias telas mora em **um componente só**
  (`components/cabecalho-dono.tsx`), nunca copiado em cada página.
- Posição de navegação não pode depender do conteúdo ao redor: coluna própria
  numa grade (`1fr auto 1fr`), com as pontas truncando.
- Elemento que aparece e some (CTA que surge ao rolar) não pode empurrar o
  vizinho — reserva espaço ou fica ancorado na ponta.
- **Verificação obrigatória:** medir `getBoundingClientRect().x` do controle nas
  telas envolvidas, em pelo menos 1440, 1024, 768 e 390, e comparar os números.
  "Parece igual" não conta.

---

## Checklist antes de commitar

1. `git status` — só o que eu pretendia mudar está aí?
2. `npx tsc --noEmit` e `npm run build` limpos.
3. O caminho real foi exercitado (seção 2), com evidência que eu possa citar.
4. Se toca em exclusão: raio da cascata mapeado e prova positiva exigida (seção 1).
5. Se toca em auth/autorização: vale no servidor **e** no banco (seção 6).
6. Se toca em dinheiro: existe constraint/trigger (seção 5).
7. O comentário explica **por quê**, não o quê.
8. Se mexeu em layout compartilhado: as posições foram **medidas** em 1440,
   1024, 768 e 390 (seção 10).
9. Se adicionou algo que roda sozinho: só com a aba à vista, e sem piscada
   nem pulo de layout (seção 9).
