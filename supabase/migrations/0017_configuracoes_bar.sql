-- ButecoApp — Configurações avançadas do bar (Horários de funcionamento, telefone e cidade)
-- Migration 0017

alter table public.bars
  add column if not exists horario_abertura time not null default '18:00:00',
  add column if not exists horario_fechamento time not null default '03:00:00',
  add column if not exists telefone text,
  add column if not exists cidade text;

comment on column public.bars.horario_abertura is 'Horário padrão de abertura do bar';
comment on column public.bars.horario_fechamento is 'Horário padrão de fechamento do bar';