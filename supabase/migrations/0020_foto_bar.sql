-- Adiciona a foto do bar e as configurações de acessibilidade
ALTER TABLE public.bars
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS acessibilidade jsonb DEFAULT '{"tamanho_fonte":"padrao","alto_contraste":false,"modo_daltonico":"nenhum"}'::jsonb;

COMMENT ON COLUMN public.bars.foto_url IS 'URL da foto/logotipo personalizado do bar';
COMMENT ON COLUMN public.bars.acessibilidade IS 'Preferências de acessibilidade do bar';