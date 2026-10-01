-- Two owners in different bars plus an admin; fixtures for cross-tenant attempts.
-- Password for all three: Senha-Teste-Local-1 (hash passed in as :h).
insert into public.users(id,email,password_hash) values
 ('11111111-1111-4111-8111-111111111111','dono-a@example.test',:'h'),
 ('22222222-2222-4222-8222-222222222222','dono-b@example.test',:'h'),
 ('33333333-3333-4333-8333-333333333333','admin@example.test',:'h');
insert into public.bars(id,owner_id,nome,slug) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Bar A','bar-a'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Bar B','bar-b');
insert into public.administradores(user_id,email) values ('33333333-3333-4333-8333-333333333333','admin@example.test');
insert into public.clientes(id,bar_id,nome) values
 ('b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Mesa B1'),
 ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Mesa A1');
insert into public.produtos(id,bar_id,nome,preco_centavos) values
 ('a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Cerveja A',1000),
 ('b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Cerveja B',1200);
insert into public.lancamentos(id,cliente_id,produto_id,quantidade,valor_unitario_centavos) values
 ('b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2','b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1','b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0',2,1200);
insert into public.pedidos_pendentes(id,bar_id,cliente_id,produto_id,quantidade,valor_unitario_centavos) values
 ('b3b3b3b3-b3b3-4b3b-8b3b-b3b3b3b3b3b3','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1','b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0',1,1200);
