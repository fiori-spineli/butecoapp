# ButecoApp

Aplicação Next.js para comandas, pedidos, produtos e fechamento de bares.

## Arquitetura atual

| Responsabilidade | Serviço | Código |
| --- | --- | --- |
| Aplicação e APIs | Vercel / Next.js 16 | `app/`, `proxy.ts` |
| Dados e identidade local | Neon PostgreSQL | `lib/neon-db.ts`, `lib/neon/`, `neon/migrations/` |
| Imagens | Cloudflare R2 | `lib/r2.ts`, `lib/upload-route.ts` |
| Códigos de recuperação | Resend | `lib/email-resend.ts`, `lib/neon/recovery.ts` |
| Proteção dos formulários | Cloudflare Turnstile | `lib/turnstile.ts` |

O banco só é acessado no servidor. Toda operação de bar deve receber o `bar_id` da sessão e filtrar a consulta por ele. Actions administrativas exigem sessão de administrador com TOTP recente. Convites para donos de bar têm token aleatório de uso único; abrir o link não o consome.

## Desenvolvimento

1. Use Node.js 24 e `npm ci`.
2. Copie `.env.example` para `.env.local` e preencha os valores. Use uma branch Neon descartável para desenvolvimento.
3. Rode `npm run dev`.
4. Rode `npm run lint`, `npx tsc --noEmit` e `npm run build` antes de enviar alterações.

`DATABASE_URL` da aplicação usa o pooler do Neon. Migrações exigem conexão **direta** e `NEON_EXPECTED_HOST` igual ao host da URL:

```powershell
$env:DATABASE_URL = '<URL direta da branch de teste>'
$env:NEON_EXPECTED_HOST = ([uri]$env:DATABASE_URL).Host
node neon/migrate.mjs
node neon/verify.mjs
```

O migrador confere o SHA-256 de cada arquivo aplicado. Crie sempre um arquivo numerado novo; não edite migrations já aplicadas. `neon/verify.mjs` executa seus testes em transação e faz rollback. `neon/verify-admin.mjs` só aceita o host do branch de migração criado em 2026-09-25; ajuste esse bloqueio para um novo branch de teste antes de usá-lo.

## Operação e segurança

- `SECRET_KEY`, `IP_HASH_SALT` e `ADMIN_MFA_ENROLLMENT_KEY` são segredos diferentes. Guarde somente na Vercel e no ambiente local; não os envie ao navegador.
- Configure `NEXT_PUBLIC_SITE_URL` com o domínio HTTPS canônico em produção. Ele define a origem dos convites e QR codes.
- Configure `R2_PUBLIC_DOMAIN` com o domínio público de leitura do bucket. As credenciais S3 do R2 ficam apenas no servidor. As URLs de imagens aceitas são restritas ao domínio configurado.
- Configure e verifique um domínio remetente no Resend. Recuperação de senha depende de `RESEND_API_KEY` e `RESEND_FROM_EMAIL`.
- Configure as duas chaves do Turnstile. Em produção, ausência de configuração bloqueia os formulários protegidos.
- O primeiro cadastro TOTP de um administrador exige a chave de ativação. Depois, a sessão administrativa exige código de seis dígitos e expira a elevação após 12 horas.
- Não ative o deploy de produção antes de conferir todas as etapas de `MIGRACAO_NEON.md`.

## Dados antigos

O diretório `supabase/` guarda apenas o histórico de migrations e templates da plataforma anterior. Nenhuma rota ou dependência do aplicativo usa Supabase. A migração de objetos antigos e a validação da paridade de dados estão descritas em `MIGRACAO_NEON.md`.
O backend Python anterior foi retirado; a aplicação usa apenas as rotas Next.js e Server Actions deste repositório.
