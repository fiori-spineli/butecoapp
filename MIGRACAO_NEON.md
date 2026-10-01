# Migração para Neon: estado e corte

Atualizado em **01/10/2026** (segunda rodada, com acesso ao Neon pelo `neonctl`). Branch `codex/neon-auth-security`, PR #1 em rascunho, base `master`.
**Não está pronto para merge nem para corte.** A condição de corte está no fim deste arquivo; hoje
quatro dos seis critérios estão bloqueados por acesso, não por código.

## 0. O que mudou de entendimento nesta rodada

1. **A produção já não roda o app do Supabase.** `butecoapp.vercel.app` serve o deploy
   de produção do commit `99182fe` da `master` (25/09). É um híbrido: o login
   lê `public.users` no Neon, mas o resto das telas ainda chama `supabase.auth.getUser()`.
   O último deploy da `master` (`d90f227`) falhou no build. Consequências medidas em 01/10:
   - o cookie de sessão da produção é **JSON em base64 sem assinatura** (`{sub, email, is_admin}`):
     qualquer um forja `is_admin`. Hoje ele só decide o redirecionamento da página `/`, porque as
     outras telas dependem do Supabase;
   - `/dashboard` sem sessão responde **200 com erro de servidor** (digest no HTML) em vez de mandar
     ao login. É indício forte de que a produção não consegue mais falar com o Supabase: as variáveis
     `NEXT_PUBLIC_SUPABASE_*` e `SUPABASE_SERVICE_ROLE_KEY` **não existem** em nenhum ambiente da
     Vercel. Confirmar exige os logs de runtime da Vercel, que o conector desta sessão não lê
     (403 no escopo `butequeiros`);
   - o login da produção mostra a mensagem crua do Postgres em erro e conecta com
     `rejectUnauthorized: false`.

   Ou seja: o PR não substitui um sistema estável; ele substitui um sistema já degradado. Isso aumenta
   a urgência do corte, mas não reduz nenhum critério de corte.
2. **A origem teve dados e eles sumiram.** As tabelas operacionais do Supabase estão vazias, mas as
   estatísticas do Postgres mostram que `bars` recebeu 29 inserções e 14 exclusões, `clientes` 15/5,
   `produtos` 15/13, `lancamentos` 14/6, `pagamentos` 4/2 e `pedidos_pendentes` 53/3, e hoje todas
   têm 0 linhas vivas. Inserção menos exclusão não dá zero: o padrão é de `TRUNCATE`, que não conta
   como exclusão. "Tabelas vazias" **não** quer dizer "nunca houve o que migrar". Se esses dados
   foram para o Neon antes de serem apagados, só a leitura do Neon dirá; ver §2.

## 1. Matriz por gate

`PASS` = provado com evidência citável. `BLOCKED` = depende de acesso ou decisão que esta sessão não
tem. `FAIL` = verificado e errado. "Local" = Postgres descartável em Docker + `next start` do commit
indicado (`neon/e2e/run.sh`); **não é evidência sobre o Neon nem sobre o preview** (GUARDRAILS §2).

| # | Requisito | Ambiente | Commit | Resultado | Evidência | Próximo passo / responsável |
|---|---|---|---|---|---|---|
| 1 | Migrations 0001–0005 aplicam, são idempotentes e o migrador recusa host errado/pooler | Local | `6f19aa7` | PASS | `run.sh`: 5 aplicadas, 5 `skip` na segunda execução; host divergente recusado | — |
| 1 | `schema_migrations` e hashes no Neon de produção | Neon produção | — | PASS | as 4 linhas registradas em 26/09 têm exatamente os SHA-256 da tabela abaixo | — |
| 1 | `0005` aplica no esquema real e é idempotente | Neon descartável (cópia da produção, com expiração) | `6f19aa7` | PASS | `applied 0005_sessions.sql`, depois `skip` | aplicar na produção antes do merge (precisa de autorização, ver §8) |
| 1 | Esquema base reproduzível | — | — | FAIL | a 0001 pressupõe `users`, `bars`, `clientes` etc. já existentes; nenhuma migration as cria | gerar `pg_dump --schema-only` da produção como baseline versionada fora de `migrations/` |
| 1 | Índices, FKs, triggers, grants, ownership | Neon produção | — | BLOCKED | a auditoria rodou (saída 0) e as tabelas pertencem à role dona do banco, sem RLS; a leitura das seções 6–9 foi barrada pela revisão automática ("Production Reads") | o dono lê a saída ou libera a leitura |
| 2 | Paridade origem × destino | Origem | — | PASS (lado origem) | impressão digital abaixo, recalculada em 01/10 | — |
| 2 | Paridade de identidades | Neon produção | — | PASS | administradores: MD5 idêntico (`59c234…`). Usuários: os 7 da origem batem um a um por instante de criação e presença de senha (3 sem senha nos dois lados). O 8º do Neon foi criado em 15/09, tem senha e é o dono do único bar; **não existe mais no Auth da origem**: o Neon preservou um cliente que a origem perdeu | — |
| 2 | Paridade operacional | Neon produção | — | PASS (com perda anterior) | Neon: 1 bar, 0 comandas, 0 produtos, 0 lançamentos, 0 pagamentos, 0 pedidos, 0 interessados; zero órfãos, zero saldo negativo. As linhas que a origem teve (§0.2) **não estão no Neon**: foram perdidas antes da migração, não nela | decidir se há algo a recuperar (backup diário do Supabase, se o plano tiver) · dono |
| 2 | Backup verificável da origem | Origem | — | Parcial | único objeto do Storage baixado; MD5 = eTag | `pg_dump` completo (exige senha do banco, BLOCKED) · dono |
| 3 | Revogação de sessão no servidor (logout, senha, suspensão, rotação no MFA) | Local | `6f19aa7` | PASS | 42/42 em `sessao-mfa-isolamento.mjs` | repetir no preview |
| 3 | Cookie `HttpOnly` + `Secure` + `SameSite=Lax` | Local (build de produção) | `6f19aa7` | PASS | `Set-Cookie` do login | repetir no preview |
| 4 | TOTP: chave errada, janela ±1, replay, 5 tentativas/15 min, MFA vencido, chamada direta sem UI | Local | `6f19aa7` | PASS | mesmo roteiro | — |
| 4 | `ADMIN_MFA_ENROLLMENT_KEY` e inscrição dos dois admins | Vercel / pessoas | — | BLOCKED | variável **ausente** em todos os ambientes | criar a chave (≥32 caracteres aleatórios), inscrever os dois admins · dono + admins |
| 5 | Recuperação por e-mail | Resend | — | BLOCKED | conta Resend conectada **sem nenhum domínio**; `RESEND_*` ausentes em todos os ambientes | verificar domínio remetente, criar as variáveis, testar com destinatário controlado · dono |
| 5 | Senha para os 3 usuários sem `password_hash` | Neon produção | — | PASS (nada a fazer) | os 3 não têm bar nem são admin: entravam por link mágico/Google e não têm o que acessar. Se algum virar dono, "criar cliente" no `/admin` reaproveita a conta e gera o convite | — |
| 9 | TLS ao banco resistente a upgrade do `pg` | Neon descartável via pooler | `cbf32aa` | PASS | `sslmode=require` vira `verify-full`; baterias verdes pelo pooler, log sem aviso de SSL | — |
| 5 | Checagem de senha vazada | — | — | BLOCKED (decisão) | removida no PR; regras locais seguem ativas | decidir: k-anonimato HIBP (só 5 hex do SHA-1 saem do servidor) ou aceitar o risco por escrito · dono |
| 6 | Isolamento entre bares em actions, rotas, upload e URL de comanda | Local | `6f19aa7` | PASS | 11 tentativas cruzadas recusadas, dados do outro bar intactos; 7 URLs de foto forjadas recusadas | repetir no preview com duas contas reais de teste |
| 6 | `verify.mjs` / `verify-admin.mjs` em branch Neon descartável | Neon descartável | `6f19aa7` | PASS | 12 checagens + provisionamento/cascata, tudo com rollback | — |
| 6/7/8 | App inteiro (`next start`) contra o esquema real do Neon | Neon descartável | `6f19aa7` | PASS | 42/42 sessão/MFA/isolamento, 7/7 dinheiro e concorrência, upload e URLs de foto, com contas `@example.test` só na branch descartável | — |
| 7 | Concorrência e regras de dinheiro | Local | `6f19aa7` | PASS | 10 pagamentos simultâneos do saldo → 1 aceito; 6 de 1 un. num item de 3 → 3; remoção de item pago, fechamento com pendente e lançamento em comanda fechada recusados | repetir no Neon (isolamento e locks reais) |
| 7 | Views × cálculo da app | Neon descartável | `6f19aa7` | PASS | `comandas_resumo` exata em centavos (3 × 25,50 = 76,50) no esquema real; a produção não tem comanda nenhuma para comparar | — |
| 8 | Validação de upload (vazio, >6 MB, inválido, >20 MP, origem, sessão) | Local | `6f19aa7` | PASS | `upload.mjs` | — |
| 8 | Bucket R2 real, leitura pública, exclusão, mídia legada | R2 | — | BLOCKED | `R2_*` só em Production; nenhum teste contra o bucket | testar no preview com variáveis de Preview |
| 9 | Variáveis por ambiente | Vercel | — | FAIL | ver §4 | — |
| 9 | Nenhum segredo com `NEXT_PUBLIC_` | Vercel | — | PASS | só `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | — |
| 9 | Preview autenticado, logs de build e runtime | Vercel | — | BLOCKED | o preview não tem variáveis; criá-las (para a branch Neon descartável) foi barrado pela revisão automática ("Secret-Store Writes") | o dono autoriza a gravação de variáveis ou as cria (§8) |
| 10 | Ponta a ponta em preview | Vercel | — | BLOCKED | depende de 4, 5, 8 e 9 | — |
| 11 | Runtime sem Supabase | Código + origem | `6f19aa7` | PASS | nenhuma referência em `app/`, `lib/`, `components/`, `proxy.ts`, `package.json`; logs da origem em 24 h: zero requisições do app (só uma curl manual e o download do backup) | repetir no preview pelo painel de rede |
| 11 | Avisos do Security Advisor da origem | Origem | — | Classificado | ver §5 | resolver desativando a origem após o corte |
| 12 | PR em rascunho enquanto houver bloqueio | GitHub | — | PASS | PR #1 draft | — |

### Hashes que o Neon tem de ter em `app_private.schema_migrations`

`.gitattributes` fixa os bytes destes arquivos: qualquer conversão de fim de linha mudaria o hash e
faria o migrador recusar uma migration já aplicada.

| Migration | SHA-256 |
|---|---|
| `0001_core.sql` | `379319300bf6663b6fd95cf1c1c7f139dc0cef637a25c8d9d22bb820726550c0` |
| `0002_identity.sql` | `b2050b5caf2cfdff2b5228c352c982139bd1c5771297fffdd7f463728f52869e` |
| `0003_recovery.sql` | `2a471d5ca12bbefb6a21dc2dd188a3977218c160b017c3780cda05afe8ea53da` |
| `0004_email_identity.sql` | `c9ba88293720b616a414b0dff1f4f28064052d98dfa749d4d4f8c75f5e12f591` |
| `0005_sessions.sql` | `814c5c8082c0ab585f8f1edf0cdd5cfb3e8ca53e323ad106f83b9467953c818a` (ainda **não** aplicada em nenhum Neon) |

## 2. Dados e mídia

### Impressão digital da origem (Supabase de origem, leitura de 01/10/2026)

Fórmula: `count(*)` e `md5(string_agg(id::text, ',' ORDER BY id))`. A mesma fórmula está em
`neon/auditoria.sql`.

| Tabela | Linhas | MD5 dos IDs | Observação |
|---|---|---|---|
| `auth.users` | 7 | `8e5eb93ed5a2b692f6a33337be9cd105` | 4 com senha, 6 com login, 7 com e-mail confirmado; criados entre 09/09 e 24/09 |
| `public.administradores` | 2 | `59c234c817e3d27b993e4f5ca3022339` | |
| `public.users` | 0 | vazio | tabela criada à mão na origem (`id, email, password_hash, created_at`), nunca recebeu linha |
| `bars`, `clientes`, `produtos`, `lancamentos`, `pagamentos`, `pedidos_pendentes`, `interessados` | 0 | vazio | as seis primeiras tiveram dados; ver §0.2 |
| `storage.objects` | 1 | `7fbcd316d5379c08ef8c870dd121e672` | ver abaixo |

**O oitavo usuário do Neon** está explicado (matriz, gate 2): é o dono do único bar, criado em 15/09 e depois apagado do Auth da origem.

Neon de produção em 01/10 (projeto, branch, banco e role identificados e conferidos antes de qualquer SQL; os identificadores ficam fora deste repositório público): Impressão digital: `users` 8 (`720bf089…`, 3 sem senha, 0 suspensos), `administradores` 2 (`59c234…`), `bars` 1 (`48ba8a3a…`), demais 0. A branch de teste antiga expira em 03/10; a branch de auditoria criada nesta rodada expira em 04/10.

### Mídia legada

| Item | Valor |
|---|---|
| Objeto da origem | `produtos-imagens/170bfba9-…/logo_1789504135995.webp`, 6 414 bytes, `image/webp`, criado em 15/09 |
| MD5 (= eTag do Storage) | `df4a58be4533a1a8d9a8ce8a0f3ab7ab` |
| SHA-256 | `31e714bbf3f0433550ded3802adcfb7b5d05a24ed508126ac15853d4e10c7afc` |
| Backup | baixado e conferido em 01/10, fora do repositório |
| Referência no Neon | em 01/10 a única `foto_url` do Neon aponta para o Storage do Supabase de origem. O id do bar no Neon **não** é a pasta `170bfba9-…` do único objeto do bucket (MD5 do id difere), e o bucket teve 6 exclusões: a foto do bar provavelmente aponta para um arquivo que já não existe. Ler o caminho exato é leitura de produção, barrada nesta rodada. Em 26/09 a foto do bar apontava para outra URL do Storage antigo. O script local de 26/09 testava se a pasta do objeto (`170bfba9-…`) é o id do bar no Neon, mas o resultado não foi registrado: **não presumir**. Reconciliar antes de mexer: ler a URL atual (`auditoria.sql` §3), baixar se ainda existir, comparar checksums, subir para `logos/<bar_id>/<uuid>.webp` no R2, conferir leitura pública HTTPS e só então atualizar `bars.foto_url`. A URL antiga é recusada pela validação do R2, então nada a apaga por engano. |

## 3. Vulnerabilidades e defeitos, por severidade

| Severidade | Onde | Achado | Estado |
|---|---|---|---|
| **Alta** | Produção atual (`99182fe`) | Cookie de sessão sem assinatura; erro do Postgres mostrado ao usuário; TLS do banco sem verificação | Aberto. Corrige-se com o corte, não com remendo na `master` |
| **Alta** | Produção atual | Telas do dono quebradas sem Supabase configurado (indício; logs inacessíveis) | Aberto; confirmar nos logs da Vercel |
| Média | Branch | Logout só apagava o cookie; token copiado valia até 30 dias | **Corrigido** em `6f19aa7` (`app_private.sessions`) e testado |
| Média | Branch | Reativar um dono suspenso ressuscitaria tokens antigos | **Corrigido**: suspensão revoga as sessões |
| Média | Neon | Esquema base fora das migrations: rollback e branch nova não se reconstroem do repositório | Aberto |
| Baixa | Branch | Limite do MFA contava acertos: admin travava ao entrar em vários aparelhos | **Corrigido** |
| Baixa | Branch | Imagem inválida voltava 500 e era logada como falha do R2 | **Corrigido** |
| Baixa | Branch | Recusa dos triggers de dinheiro chegava como mensagem genérica | **Corrigido** |
| Baixa | Origem | Avisos do Security Advisor | Classificados em §5 |

**Duração da sessão** (reavaliada): 30 dias com "manter conectado" segue, agora revogável no servidor.
A elevação de MFA segue em 12 h, a mesma janela de `lib/mfa-frescor.ts` da era Supabase. Encurtar
qualquer uma é decisão de produto, não de segurança: o risco que justificaria encurtar (token
copiado) foi fechado pela revogação.

**Rotação de `SECRET_KEY`:** ela assina sessões e convites e deriva a chave que cifra os segredos TOTP.
Trocar derruba todas as sessões (desejável num incidente), invalida códigos de recuperação em aberto
(duram 1 h) e **inutiliza os fatores MFA**. Procedimento: trocar a chave, apagar as linhas de
`app_private.mfa_factors` dos dois admins e refazer a inscrição com `ADMIN_MFA_ENROLLMENT_KEY`.
O mesmo `DELETE` (seguido de `UPDATE app_private.sessions SET revoked_at = now() WHERE user_id = …`)
é o procedimento de **troca de aparelho ou perda do autenticador**.

## 4. Variáveis por ambiente (só nomes; lidos da Vercel em 01/10)

| Variável | Production | Preview | Development |
|---|---|---|---|
| `DATABASE_URL`, `SECRET_KEY`, `IP_HASH_SALT` | presente | **ausente** | **ausente** |
| `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN` | presente | **ausente** | **ausente** |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_SITE_URL` | presente | **ausente** | **ausente** |
| `ADMIN_MFA_ENROLLMENT_KEY` | **ausente** | **ausente** | **ausente** |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | **ausente** | **ausente** | **ausente** |
| `EMAIL_AVISO_INTERESSE`, `EMAIL_REMETENTE` | **ausente** | **ausente** | **ausente** |
| `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | ausente | ausente | ausente |

O preview "Ready" do PR foi construído **sem nenhuma variável**: toda página que toca o banco falha
nele. Antes de validar o preview, criar as variáveis de Preview apontando para uma **branch Neon
descartável** (nunca a produção) e um bucket ou prefixo R2 de teste. Os valores de
`DATABASE_URL`, `SECRET_KEY` e o tamanho mínimo de 32 caracteres não puderam ser conferidos: o
conector lê nomes, não valores, e esta auditoria não decifra segredos.

## 5. Supabase de origem: avisos classificados

| Aviso | Classificação |
|---|---|
| `public.users` com RLS e sem policy | Tabela vazia e sem uso; RLS sem policy nega tudo a `anon`/`authenticated`. Sem risco. |
| `comanda_publica` e `fazer_pedido_cliente` executáveis por `anon` | Intencionais (QR da comanda). Exigem o token UUID da comanda e têm teto no caminho público. Com as tabelas vazias, não há o que ler nem onde gravar. |
| `admin_executar_manutencao`, `painel_admin_metricas`, `eh_admin` por `authenticated` | Checam `aal2` por dentro (`0011`). `disable_signup` foi conferido no projeto antigo, não neste: conferir antes de contar com ele. |
| `confirmar_entrega_pedido`, `recusar_pedido_pendente` por `authenticated` | Checagem de bar dentro da função e FK composta (`0023`). |
| Proteção de senha vazada desligada | Recurso do plano Pro; irrelevante depois do corte. |

Nenhum exige mudança antes do corte. Todos somem quando a origem for desativada (§7, passo 8).
Nada foi alterado na origem nesta rodada.

## 6. Testes locais repetíveis

```bash
bash neon/e2e/run.sh   # Docker + Node 24; ~3 min; derruba tudo no fim
```

Sobe um Postgres descartável com a base ORM (`neon/e2e/local-base.sql`), aplica as migrations duas
vezes, roda `verify.mjs` (12 checagens) e `verify-admin.mjs`, carrega dois bares e um admin
(`seed.sql`), faz o build com segredos aleatórios e as chaves públicas de teste do Turnstile, e roda:
`sessao-mfa-isolamento.mjs` (42 casos), `dinheiro.mjs` (7) e `upload.mjs` (11). Resultado em
01/10 no commit `6f19aa7`: tudo verde. As rodadas intermediárias tiveram falhas reais (rate limit do
MFA, mensagem de recusa genérica), o que prova que a bateria sabe reprovar.

`verify-admin.mjs` agora exige `NEON_DISPOSABLE_HOST` (conexão direta da branch descartável) e
`NEON_PRODUCTION_HOST`, e recusa quando são iguais ou quando a URL é de pooler.

## 7. Plano de corte

**Pré-condições** (todas `PASS` na matriz): paridade demonstrada; MFA dos dois admins ativo;
recuperação entregue de verdade; mídia legada reconciliada; preview validado ponta a ponta;
ausência de Supabase no tráfego do preview; rollback ensaiado.

1. Snapshot da branch de produção do Neon e `pg_dump` completo da origem Supabase, com checksum.
2. `neon/auditoria.sql` na produção: registrar a saída agregada no PR.
3. Branch descartável a partir do snapshot → `node neon/migrate.mjs` (aplica a `0005`) →
   `verify.mjs` → `verify-admin.mjs` → `auditoria.sql`.
4. Variáveis de Preview apontando para essa branch → deploy de preview → bateria de `neon/e2e` adaptada
   ao preview + percurso manual em 390 px e 1440 px.
5. Variáveis de Production que faltam (§4). **Aplicar a `0005` na produção antes do merge**: sem a
   tabela de sessões, o login falha fechado.
6. Merge do PR → deploy de produção → login real de um dono e de um admin, comanda de teste aberta e
   fechada (e apagada depois), conferência do painel de rede: nenhuma chamada a `supabase.co`.
7. Observação de 72 h nos logs de runtime da Vercel (erros 5xx, falhas de sessão, uploads).
8. Só então: desativar a origem Supabase, mantendo o `pg_dump` do passo 1. `supabase/` segue no
   repositório como histórico até decisão explícita.

**Rollback:** até o passo 6, nada em produção mudou além da `0005`, que é aditiva (tabela nova) e não
afeta o código atual da `master`. Depois do passo 6: promover de volta o deploy anterior na Vercel
(o do commit `99182fe`, marcado como candidato a rollback no painel). Lembrete honesto: esse deploy é o híbrido degradado de §0.1,
então o rollback devolve um sistema que já não atende o dono; um rollback "bom" exigiria restaurar
as variáveis do Supabase **e** os dados que foram apagados da origem. Por isso o passo 1 é
inegociável.

## 8. Do que esta auditoria precisa para continuar

Acesso ao Neon resolvido em 01/10 pelo `neonctl` autenticado no navegador do dono, e a CLI da
Vercel também está autenticada. O que falta são **autorizações**, não credenciais. A revisão
automática do Claude Code barrou três categorias, e cada uma é decisão do dono:

1. **Leitura da produção Neon** (seções 6–9 do `auditoria.sql` e o caminho de `bars.foto_url`).
2. **Gravação em cofre de segredos**: variáveis de Preview para a branch do PR e as que faltam em
   Production (`ADMIN_MFA_ENROLLMENT_KEY`). Os valores iriam de arquivo para a CLI pela entrada
   padrão, sem aparecer em chat ou log.
3. **Escrita na produção**: aplicar a `0005` no Neon de produção, mesclar o PR e promover o deploy.

Fora do alcance de qualquer autorização: **domínio verificado no Resend** (exige um domínio do dono,
com DNS) e a decisão sobre a checagem de senha vazada.
