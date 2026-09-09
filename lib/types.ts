export type Bar = {
  id: string;
  owner_id: string;
  nome: string;
  slug: string;
  /** Texto enviado junto ao link da comanda. Nulo = usar o padrão do app. */
  mensagem_qr: string | null;
  created_at: string;
};

export type Cliente = {
  id: string;
  bar_id: string;
  nome: string;
  numero_mesa: string | null;
  token: string;
  status: "aberta" | "fechada";
  fechada_em: string | null;
  created_at: string;
};

export type Produto = {
  id: string;
  bar_id: string;
  nome: string;
  preco_centavos: number;
  imagem_url: string | null;
  created_at: string;
};

export type Lancamento = {
  id: string;
  cliente_id: string;
  produto_id: string | null;
  descricao: string | null;
  quantidade: number;
  valor_unitario_centavos: number;
  created_at: string;
  produtos?: Pick<Produto, "nome" | "imagem_url"> | null;
};

export type Pagamento = {
  id: string;
  cliente_id: string;
  lancamento_id: string | null;
  quantidade_paga: number | null;
  valor_centavos: number;
  descricao: string | null;
  created_at: string;
};

/** View comandas_resumo — cliente + totais já calculados no banco. */
export type ComandaResumo = Cliente & {
  total_centavos: number;
  pago_centavos: number;
  restante_centavos: number;
  itens: number;
};

/** Retorno da função comanda_publica(token) — visão do cliente, sem login. */
export type ComandaPublica = {
  bar_nome: string;
  cliente_nome: string;
  numero_mesa: string | null;
  status: "aberta" | "fechada";
  fechada_em: string | null;
  total_centavos: number;
  pago_centavos: number;
  restante_centavos: number;
  itens: {
    id: string;
    nome: string;
    descricao_livre: boolean;
    imagem_url: string | null;
    quantidade: number;
    valor_unitario_centavos: number;
    total_centavos: number;
  }[];
};
