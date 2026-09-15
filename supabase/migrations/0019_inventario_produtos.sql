-- Adiciona controle de estoque
alter table public.produtos
  add column if not exists estoque_atual integer not null default 0 
  check (estoque_atual >= 0);

comment on column public.produtos.estoque_atual is 'Quantidade física atual no estoque';