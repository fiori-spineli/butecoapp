# Migração para Neon: estado e corte

Atualizado em 26/09/2026. Branch de código: `codex/neon-auth-security`; PR em rascunho: #1. **Produção ainda não foi promovida.** O branch Neon de teste `br-winter-wave-b6gegw08` expira em 02/10/2026; ele não é a base de produção.

## Implementado no código

| Etapa | Estado |
| --- | --- |
| Sessão local assinada, revogação por troca de senha e suspensão | Implementada; build passou |
| TOTP administrativo com segredo cifrado e bloqueio de repetição | Implementado; exige ativação e teste real |
| Convite de uso único e redefinição com código Resend | Implementado; entrega de e-mail ainda sem credenciais |
| Leituras e mutações de comandas, pedidos, produtos, relatórios e admin | Portadas para Neon; testes de fluxos completos pendentes |
| Regras de integridade financeira, identidade e isolamento entre bares no banco | Oito verificações passaram nos branches de teste e produção, sempre com rollback |
| Upload de imagens para R2 com escopo por bar | Implementado; acesso ao bucket e leitura pública ainda não validados |
| Remoção do cliente Supabase e do keep-alive | Concluída no código; `supabase/` guardado como histórico |
| Retirada do backend Python antigo | Concluída; o app usa somente as rotas Next.js e as Server Actions |
| CSP e proteção de formulários | Aplicadas; home local sem erro após correção de hidratação |
| Sigilo de URLs de convite e comanda nas métricas | Analytics limpa os tokens; Speed Insights não mede essas rotas |
| Checagem de senha em base pública de vazamentos | Pendente; a revisão automática rejeitou a consulta externa derivada da senha nesta sessão. As regras locais de senha continuam ativas |

As migrations `0001_core.sql`, `0002_identity.sql`, `0003_recovery.sql` e `0004_email_identity.sql` foram aplicadas nos branches Neon de teste e produção. Antes de aplicá-las à produção, foi criado o snapshot `snap-dry-wind-b687fvq3` em 26/09/2026. A última migration impede identidades com e-mails iguais ao ignorar maiúsculas; a consulta de produção encontrou zero grupos duplicados. O banco de produção confirmou quatro migrations registradas, e as oito verificações transacionais passaram com rollback. Nunca copie dados do branch de teste para produção.

## Dados de origem observados

Na leitura do painel Supabase em 26/09, `public.users` tinha 0 linhas, `administradores` 2 e as tabelas operacionais estavam vazias. O Auth tinha 7 usuários; os sete IDs foram encontrados no Neon de produção, que tinha 8 usuários. Três usuários migrados tinham `password_hash` nulo e precisam definir uma senha pelo convite/recuperação. Os dois administradores têm senha, mas nenhum tem MFA ativo. No Neon de produção havia 1 bar, com foto apontando para URL antiga do Storage Supabase. O bucket `produtos-imagens` mostrava um único objeto visível, em pasta e nome diferentes dessa URL; é necessário reconciliar os arquivos antes de cortar.

## Bloqueios de produção

1. Configurar `RESEND_API_KEY` e `RESEND_FROM_EMAIL` com domínio verificado na Vercel; confirmar entrega de recuperação para destinatário real.
2. Configurar `ADMIN_MFA_ENROLLMENT_KEY` forte e inscrever os dois administradores no TOTP. Conferir login, recuperação e revogação de sessão em preview.
3. Configurar `NEXT_PUBLIC_SITE_URL=https://butecoapp.vercel.app`; validar convites e QR codes.
4. Validar o bucket R2 com as cinco variáveis já cadastradas na Vercel, a leitura pública, upload e limpeza. Reconciliar a foto legada que hoje aponta ao Supabase.
5. Repetir a paridade de dados e arquivos da origem; a consulta SQL de produção via painel Supabase foi barrada pela revisão automática desta sessão, então a conferência detalhada depende de outro caminho autorizado. Não presumir paridade pelo fato de as tabelas operacionais estarem vazias.
6. Executar testes de ponta a ponta em preview, revisar as variáveis por ambiente e só então promover o deploy. O check de preview da Vercel confirma o build, mas não a operação das páginas dinâmicas. Confirmar que a aplicação não faz requisições ao domínio Supabase.
7. Após o corte e a conferência de tráfego, remover da Vercel as variáveis e chaves Supabase que não forem mais usadas, conferir URLs antigas no Neon e no R2 e guardar um backup da origem antes de desativá-la. O diretório `supabase/` no repositório é somente histórico e pode ser arquivado fora do código em uma limpeza posterior.

## Verificação repetível

```powershell
npm ci
npx tsc --noEmit
npm run lint
npm run build
```

No branch Neon descartável, execute `neon/verify.mjs` e `neon/verify-admin.mjs` com `DATABASE_URL` adequada. Ambos fazem rollback. O segundo fixa o hostname do branch de teste usado nesta auditoria.

Na validação local, uma conta temporária entrou, abriu o painel e criou uma comanda com QR; ela e seus dados foram removidos depois. A home e a tela de login foram conferidas no navegador. O teste usou um bypass temporário do Turnstile apenas no ambiente de desenvolvimento, removido do código ao final. O widget de produção não pôde ser validado localmente: o serviço retornou erro 600010 para a chave usada fora do domínio autorizado. O acesso automatizado ao navegador foi limitado pela revisão automática durante a auditoria, então faltam os testes completos de preview e R2.
