-- ButecoApp — mensagem que o dono envia junto com o link da comanda.
-- Idempotente.
--
-- Ao compartilhar o QR pelo WhatsApp, o app manda um texto antes do link.
-- Ele era fixo no código ("Sua conta no bar"): impessoal, e o cliente nem
-- sabia de que bar era. Agora cada bar escreve o seu.
--
-- Nulo ou vazio significa "usar o padrão" — ver lib/mensagem-qr.ts. Guardar
-- o padrão em toda linha só criaria cópias para manter em sincronia.

alter table public.bars
  add column if not exists mensagem_qr text;

comment on column public.bars.mensagem_qr is
  'Texto enviado junto ao link da comanda. Aceita os marcadores {bar} e {comanda}. Nulo = usar o padrão do app.';
