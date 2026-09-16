-- ButecoApp — teto no pedido feito pelo cliente. Idempotente.
--
-- Por quê
--
-- `fazer_pedido_cliente` é a ÚNICA função que alguém sem login pode chamar
-- para ESCREVER no banco. A trava dela é o token da comanda (quem tem o QR),
-- e ela já faz o essencial: recusa comanda fechada, limita a quantidade por
-- item a 99 e — o mais importante — lê o preço do banco, então o cliente não
-- consegue forjar valor.
--
-- O que faltava: nada limitava o TAMANHO DA LISTA nem o total acumulado. Com
-- um token válido (um cliente do bar, ou alguém que viu o QR de uma mesa),
-- uma única chamada com dez mil itens criava dez mil linhas, e chamadas
-- repetidas entupiam a tela de pedidos do dono no meio do movimento.
--
-- Dois tetos, cada um para um caso:
--   ITENS_POR_PEDIDO  — tamanho de uma chamada. 50 linhas distintas é muito
--                       mais do que qualquer mesa pede de uma vez.
--   PENDENTES_POR_COMANDA — fila acumulada ainda não atendida. Se já há 40
--                       pedidos pendentes naquela comanda, o problema não é
--                       mais capacidade: ou o garçom está afogado, ou é abuso.
--                       Em ambos os casos a resposta certa é parar de aceitar
--                       e avisar, não continuar empilhando.
--
-- Ambos recusam com mensagem, nunca apagam nada (GUARDRAILS.md seção 1).

create or replace function public.fazer_pedido_cliente(
  p_token uuid,
  p_itens jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_cliente public.clientes%rowtype;
  v_item jsonb;
  v_produto_id uuid;
  v_qtd integer;
  v_preco integer;
  v_total_pedidos integer := 0;
  v_pendentes integer;
  ITENS_POR_PEDIDO constant integer := 50;
  PENDENTES_POR_COMANDA constant integer := 40;
begin
  -- A lista precisa ser um array; `jsonb_array_elements` estouraria com erro
  -- cru de banco para qualquer outro formato.
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    return jsonb_build_object('ok', false, 'mensagem', 'Pedido inválido.');
  end if;

  if jsonb_array_length(p_itens) > ITENS_POR_PEDIDO then
    return jsonb_build_object(
      'ok', false,
      'mensagem', 'Esse pedido tem itens demais de uma vez. Faça em partes.'
    );
  end if;

  select * into v_cliente from public.clientes where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'mensagem', 'Comanda não encontrada.');
  end if;

  if v_cliente.status <> 'aberta' then
    return jsonb_build_object('ok', false, 'mensagem', 'Esta comanda já foi fechada.');
  end if;

  select count(*) into v_pendentes
    from public.pedidos_pendentes
   where cliente_id = v_cliente.id and status = 'pendente';

  if v_pendentes >= PENDENTES_POR_COMANDA then
    return jsonb_build_object(
      'ok', false,
      'mensagem', 'Você já tem pedidos esperando. Chame o garçom antes de pedir mais.'
    );
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    -- Para de gravar ao encostar no teto da fila, mesmo no meio da lista.
    exit when v_pendentes + v_total_pedidos >= PENDENTES_POR_COMANDA;

    v_produto_id := (v_item->>'produto_id')::uuid;
    v_qtd := coalesce((v_item->>'quantidade')::integer, 1);

    if v_qtd <= 0 or v_qtd > 99 then
      continue;
    end if;

    -- Garante que o produto pertence ao mesmo bar da comanda
    select preco_centavos into v_preco
      from public.produtos
     where id = v_produto_id and bar_id = v_cliente.bar_id;

    if v_preco is not null then
      insert into public.pedidos_pendentes (
        bar_id,
        cliente_id,
        produto_id,
        quantidade,
        valor_unitario_centavos
      ) values (
        v_cliente.bar_id,
        v_cliente.id,
        v_produto_id,
        v_qtd,
        v_preco
      );
      v_total_pedidos := v_total_pedidos + 1;
    end if;
  end loop;

  if v_total_pedidos = 0 then
    return jsonb_build_object('ok', false, 'mensagem', 'Nenhum item válido para pedir.');
  end if;

  return jsonb_build_object('ok', true, 'pedidos', v_total_pedidos);
end;
$$;

revoke all on function public.fazer_pedido_cliente(uuid, jsonb) from public;
grant execute on function public.fazer_pedido_cliente(uuid, jsonb) to anon, authenticated;
