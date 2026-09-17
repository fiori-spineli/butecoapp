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

(c) 2026-09-16 — o keep-alive do Supabase rodava `curl -i` **sem `--fail` e
sem conferir o resultado**. O `curl` devolve sucesso em HTTP 401 quando não se
pede o contrário, então o workflow ficava **verde recusado pelo banco**: a chave
no segredo do GitHub tinha ficado para trás da migração para o Brasil e o projeto
não estava sendo mantido acordado coisa nenhuma — só dizia que estava.

**Regras:**

- Exercitar **o caminho que de fato importa**, não um parecido.
- Teste de comportamento periódico espera **pelo menos um período inteiro** e
  prova que **a atualização chegou** — ausência de erro não é prova de sucesso.
- Falha engolida (`if (error) return`) não aparece em listener de erro nem no
  console. Para achar, olhe a rede, não o console.
- **Verificação que não sabe falhar não é verificação.** Todo check automático
  precisa de um caminho de falha provado: exercite-o com a entrada errada de
  propósito (chave inválida, host inexistente) e confirme que ele fica vermelho
  **e diz o porquê**. Um check que não pode reprovar é pior que nenhum: passa a
  sensação de cobertura e esconde o problema que existia para achar.
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
  ela volta (`lib/sincronia-ao-vivo.ts`, `app/c/[token]`). Aba em
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

## 11. Imagem é WebP, salvo exigência da plataforma

**Incidente — 2026-09-11.** `public/` carregava 2,8 MB em PNG: a logo em duas
versões de 733 KB e 597 KB e um ícone de PWA de 842 KB que nem era 512×512,
mais cinco SVGs do template do Next que ninguém referenciava. Nada disso
aparecia no navegador do usuário (o `next/image` converte na entrega), mas
pesava no repositório, no build e no otimizador a cada deploy.

**Regras:**

- Toda imagem nasce e é guardada em **WebP** — foto de produto, logo, ícone.
  A foto do produto já é convertida no navegador e reprocessada com `sharp` no
  servidor (`app/api/produtos/imagem/route.ts`): o que entra no Storage é
  sempre `.webp`, venha de onde vier.
- **A exceção é escrita, não presumida**: `app/apple-icon.png` continua PNG
  porque o `apple-touch-icon` do iOS não aceita outra coisa, e o manifesto do
  PWA lista WebP **e** PNG, nessa ordem — o navegador pega o primeiro que
  entende, e instalação é o único lugar onde formato não suportado não degrada,
  simplesmente não instala.
- Resolução tem teto: guardar mais pixels do que a tela pode mostrar é peso
  morto. A logo aparece com no máximo 208px de CSS, então a origem tem 1024px
  — o bastante para densidade 3×.
- Arquivo sem referência sai do repositório. Se voltar a ser preciso, o
  histórico do git tem.

---

## 12. O que mantém o app vivo não mora dentro de um componente

**Incidente — 2026-09-16, periciado numa aba de produção que o dono deixou
aberta.** O batimento que mantém a tela em dia (`/api/bar/atividade` a cada 2 s)
vivia no `useEffect` de `<AtualizacaoAoVivo />`, e **cada página montava o seu**
— sob um pai diferente em cada uma (`<div>` no dashboard, fragmento em
produtos), o que faz o React DESMONTAR e remontar a cada troca de aba em vez de
reconciliar. A limpeza do efeito (`ativo = false`, listeners removidos, timer
cancelado) rodava a cada clique na navegação.

Na aba periciada o poll rodou 112 vezes cravando 8,2 s e **parou de vez**: sem
navegação nos 6,4 minutos anteriores, sem erro no console, sem requisição
pendurada, com o React vivo (o filtro da busca ainda respondia), a tela pintando
(10 frames em 63 ms) e 26 MB de memória. `focus`, `visibilitychange` e `online`
sintéticos não ressuscitaram nada — a limpeza tinha rodado sem montagem
correspondente. Navegar também não trouxe de volta. **Só o F5 traria.** Para o
dono isso não é "a sincronia parou", é "o app congelou": ele lança no celular e
o caixa nunca mostra.

**Regras:**

- Relógio que sustenta uma promessa do produto é de **módulo**, não de
  componente. Componente assina e desassina; o relógio não para.
- Se ainda assim precisar montar em tela, monte no **layout** do grupo, nunca
  repetido em cada página: layout atravessa a navegação, página não.
- **Corrente de `setTimeout` que se reagenda é frágil por construção**: cada
  volta só existe porque a anterior chegou ao fim. Uma promessa que não resolve,
  uma exceção engolida ou uma limpeza fora de hora arrebenta a corrente em
  silêncio e para sempre. Prefira um `setInterval` que TICA e decide — ele
  continua batendo aconteça o que acontecer dentro dele.
- **Toda espera tem prazo.** `fetch` sem `AbortController` pode pendurar para
  sempre; trava de reentrada sem prazo transforma uma requisição travada em app
  mudo. Diante da dúvida, uma requisição a mais é melhor que silêncio eterno.
- Reagendamento mora no **`finally`**, nunca depois do `await` no corpo do
  `try` — é a única forma de a próxima volta acontecer quando esta deu errado.
- Quem escuta `visibilitychange`, `focus` e `pageshow` ao mesmo tempo recebe os
  três **quase juntos**: se cada um disparar seu próprio ciclo, nascem correntes
  paralelas. Marque estado e deixe o relógio decidir — uma vez.

**Como verificar (foi assim que este conserto foi aceito):**

1. Medir a **cadência real** no painel Network, não a pretendida. A primeira
   versão do conserto entregava 3,0 s e 9,0 s onde a documentação prometia 2 s e
   8 s, porque contava o intervalo a partir do FIM da requisição e a grade de um
   tique por segundo arredondava para cima.
2. Rajada de navegação **mais rápida do que a tela troca** (medido: 18
   navegações em 1659 ms) e conferir que o **maior silêncio da sessão** não
   passou da cadência ociosa.
3. Conferir que não nasceram ciclos paralelos: **nenhum** intervalo abaixo da
   cadência mínima.
4. Aba escondida: **zero** requisições. Ao voltar: a primeira em menos de 1 s.
5. Provar que a atualização CHEGA (§2): mudar o dado por fora, ver a tela mudar
   sozinha, **devolver o dado ao valor exato** e ver a tela voltar sozinha.

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
10. Se adicionou imagem: está em WebP, com teto de resolução (seção 11).
11. Se mexeu em algo que roda em ciclo: o relógio é de módulo, reagenda no
    `finally`, tem prazo de espera, e a cadência foi **medida** na rede
    depois de uma rajada de navegação (seção 12).
