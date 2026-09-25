# Migração Supabase → Neon

## Etapa 1: contenção da autenticação

Estado: implementada na branch `codex/neon-auth-security`, ainda sem implantação.

O cookie `buteco_session` agora contém somente identificador, prazo e uma versão
derivada do hash da senha. Ele é assinado com HMAC-SHA256 usando `SECRET_KEY`.
O servidor verifica a assinatura, o prazo, o usuário e a versão da senha no Neon
antes de reconhecer a sessão. O papel de administrador vem da tabela
`administradores` a cada leitura; não é aceito do cookie. Uma troca de senha
invalida as sessões anteriores.

`SECRET_KEY` precisa ter pelo menos 32 caracteres aleatórios e permanecer igual
entre as instâncias da aplicação. A falta dessa variável fecha a autenticação.
Cookies antigos, sem assinatura, deixam de valer e exigem novo login.

O fluxo antigo de recuperação não envia nem verifica código no Neon. Até existir
um fluxo completo com envio, validade curta, uso único e proteção contra abuso,
suas actions retornam erro sem atualizar senhas. O painel administrativo também
fica fechado porque o MFA atual depende do Supabase. A autorização para ler dados
administrativos deverá exigir MFA recente no servidor e nas operações de dados.

## Próximas etapas

- Implementar recuperação de conta e MFA no Neon, com verificações de ponta a ponta.
- Migrar as operações de bar, comanda, estoque, pagamento e administração.
- Expor a API e concluir o armazenamento R2 com autorização.
- Comparar dados e arquivos de origem, remover dependências Supabase e validar a
  aplicação completa antes da promoção para produção.
