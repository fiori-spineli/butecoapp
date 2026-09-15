export type Bar = {
  id: string;
  owner_id: string;
  nome: string;
  slug: string;
  mensagem_qr: string | null;
  horario_abertura?: string;
  horario_fechamento?: string;
  telefone?: string | null;
  cidade?: string | null;
  foto_url?: string | null;
  acessibilidade?: {
    tamanho_fonte?: "padrao" | "medio" | "grande";
    alto_contraste?: boolean;
    modo_daltonico?: "nenhum" | "protanopia" | "tritanopia";
  };
  created_at: string;
};

/** Retorno da função comanda_publica(token) — visão do cliente, sem login. */
export type ComandaPublica = {
  bar_nome: string;
  cliente_nome: string;
  numero_mesa: string | null;
  status: "aberta" | "fechada";
  aberta_em: string;
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
    criado_em: string;
  }[];
  cardapio?: {
    id: string;
    nome: string;
    preco_centavos: number;
    imagem_url: string | null;
  }[];
  pedidos_pendentes?: {
    id: string;
    nome: string;
    quantidade: number;
    valor_unitario_centavos: number;
    status: string;
    created_at: string;
  }[];
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
  categoria: 'comida' | 'bebida' | 'entretenimento' | 'servico' | 'outros';
  estoque_atual: number;
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

/** Uma linha da fila de interessados — a porta de entrada de bar novo. */
export type Interessado = {
  id: string;
  nome: string;
  bar_nome: string;
  email: string;
  telefone: string;
  cidade: string | null;
  mensagem: string | null;
  status: "novo" | "contatado" | "convertido" | "descartado";
  observacao: string | null;
  atendido_em: string | null;
  bar_id: string | null;
  created_at: string;
};
