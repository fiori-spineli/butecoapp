-- Adiciona categoria aos produtos
alter table public.produtos
  add column if not exists categoria text not null default 'outros'
  check (categoria in ('comida', 'bebida', 'entretenimento', 'servico', 'outros'));

comment on column public.produtos.categoria is 'Categoria para organização do cardápio';