"use client";

import { useActionState, useMemo, useState } from "react";
import {
  alternarSuspensao,
  criarClienteDoZero,
  excluirCliente,
  renomearBar,
  gerarLinkDeAcesso,
} from "@/app/actions/clientes";
import type { EstadoForm } from "@/app/actions/auth";
import { formatarDataHora } from "@/lib/format";
import { descreverDuracao } from "@/lib/tempo";
import { LoadingButeco } from "@/components/loading-buteco";

/**
 * A tela de gestão dos nossos clientes.
 *
 * A régua do que aparece aqui: serve para decidir alguma coisa sobre o CLIENTE?
 * Então entra. Diz respeito ao negócio dele? Fica de fora. Por isso tem "última
 * atividade" e contagem de comandas — que respondem "esse bar sumiu?" — e não
 * tem faturamento, ticket médio nem o que ele vende. Não é da nossa conta, e
 * um painel que mostra isso é um painel que vaza isso.
 *
 * Cada cliente abre numa gaveta com as ações. Ficam fechadas de propósito:
 * excluir e suspender não podem estar a um toque de distância numa lista.
 */

export type ClienteAdmin = {
  id: string;
  nome: string;
  slug: string;
  created_at: string;
  owner_id: string;
  owner_email: string | null;
  email_confirmado: boolean;
  ultimo_login: string | null;
  suspenso: boolean;
  total_produtos: number;
  total_comandas: number;
  comandas_abertas: number;
  ultima_atividade: string | null;
};

const CAMPO =
  "min-h-11 w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600";

/** Quanto tempo faz que a última comanda foi aberta ali. */
function saudeDoCliente(cliente: ClienteAdmin): {
  rotulo: string;
  detalhe: string;
  classe: string;
} {
  if (cliente.suspenso) {
    return {
      rotulo: "Suspenso",
      detalhe: "Acesso bloqueado; dados preservados",
      classe:
        "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300/70 dark:border-rose-900",
    };
  }

  if (!cliente.ultima_atividade) {
    return {
      rotulo: "Nunca usou",
      detalhe: cliente.ultimo_login ? "Entrou, mas não abriu comanda" : "Nunca entrou",
      classe:
        "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700",
    };
  }

  const paradoHa = Date.now() - Date.parse(cliente.ultima_atividade);
  const DIA = 86_400_000;

  if (paradoHa > 30 * DIA) {
    return {
      rotulo: "Sumido",
      detalhe: `Sem comanda há ${descreverDuracao(paradoHa)}`,
      classe:
        "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300/70 dark:border-rose-900",
    };
  }

  if (paradoHa > 7 * DIA) {
    return {
      rotulo: "Esfriando",
      detalhe: `Sem comanda há ${descreverDuracao(paradoHa)}`,
      classe:
        "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300/70 dark:border-amber-900",
    };
  }

  return {
    rotulo: "Ativo",
    detalhe: `Última comanda há ${descreverDuracao(paradoHa)}`,
    classe:
      "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-900",
  };
}

export function GestaoClientes({ clientes }: { clientes: ClienteAdmin[] }) {
  const [busca, setBusca] = useState("");
  const [abrindoNovo, setAbrindoNovo] = useState(false);

  const [estadoNovo, acaoNovo, criandoNovo] = useActionState<EstadoForm, FormData>(
    criarClienteDoZero,
    null,
  );

  const resumo = useMemo(() => {
    const contagem = { ativo: 0, esfriando: 0, sumido: 0, nunca: 0, suspenso: 0 };
    for (const c of clientes) {
      const r = saudeDoCliente(c).rotulo;
      if (r === "Ativo") contagem.ativo++;
      else if (r === "Esfriando") contagem.esfriando++;
      else if (r === "Sumido") contagem.sumido++;
      else if (r === "Suspenso") contagem.suspenso++;
      else contagem.nunca++;
    }
    return contagem;
  }, [clientes]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.owner_email ?? "").toLowerCase().includes(termo),
    );
  }, [clientes, busca]);

  return (
    <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 px-5 sm:px-6 py-4">
        <div>
          <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
            Clientes ({clientes.length})
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {resumo.ativo} ativo{resumo.ativo === 1 ? "" : "s"} · {resumo.esfriando} esfriando ·{" "}
            {resumo.sumido} sumido{resumo.sumido === 1 ? "" : "s"} · {resumo.nunca} nunca usou
            {resumo.suspenso > 0 && ` · ${resumo.suspenso} suspenso`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAbrindoNovo((v) => !v)}
          className="cursor-pointer min-h-11 rounded-xl bg-amber-700 hover:bg-amber-800 px-4 text-xs font-bold text-white shadow-xs transition-colors"
        >
          {abrindoNovo ? "Cancelar" : "+ Novo cliente"}
        </button>
      </div>

      {abrindoNovo && (
        <form
          action={acaoNovo}
          className="border-b border-stone-200 dark:border-stone-800 bg-amber-50/60 dark:bg-amber-950/20 px-5 sm:px-6 py-4"
        >
          <p className="mb-3 text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            Cria o usuário já confirmado, cria o bar e devolve o link de definir senha
            para você mandar ao dono. Use para quem falou com a gente por fora da fila.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Nome do bar
              <input name="bar_nome" required maxLength={120} className={`mt-1 ${CAMPO}`} />
            </label>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              E-mail de acesso
              <input name="email" type="email" required className={`mt-1 ${CAMPO}`} />
            </label>
          </div>
          <button
            type="submit"
            disabled={criandoNovo}
            className="cursor-pointer mt-3 min-h-11 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 px-6 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-60 sm:w-auto"
          >
            {criandoNovo ? <LoadingButeco /> : "Criar cliente"}
          </button>
          {estadoNovo && <Aviso estado={estadoNovo} />}
        </form>
      )}

      <div className="border-b border-stone-200 dark:border-stone-800 px-5 sm:px-6 py-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por bar ou e-mail..."
          className={CAMPO}
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-stone-500 dark:text-stone-400">
          {busca ? "Nenhum cliente com esse termo." : "Nenhum cliente cadastrado ainda."}
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {filtrados.map((cliente) => (
            <LinhaCliente key={cliente.id} cliente={cliente} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Aviso de resultado — com tratamento especial para link.
 *
 * Quando a resposta traz uma URL de definir senha, ela precisa sair daqui para
 * o WhatsApp do dono. URL crua dentro de um parágrafo é um convite a selecionar
 * torto e mandar pela metade, então ela ganha caixa própria e botão de copiar.
 */
function Aviso({ estado }: { estado: EstadoForm }) {
  const [copiado, setCopiado] = useState(false);
  if (!estado) return null;

  const link = estado.mensagem.match(/https?:\/\/\S+/)?.[0] ?? null;
  const texto = link ? estado.mensagem.replace(link, "").trim() : estado.mensagem;

  return (
    <div
      role="status"
      className={`mt-3 rounded-xl border px-4 py-3 text-xs font-medium ${
        estado.ok
          ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300"
          : "border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300"
      }`}
    >
      {texto && <p className="leading-relaxed">{texto}</p>}

      {link && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 break-all rounded-lg bg-white/70 dark:bg-stone-900/70 px-3 py-2 text-[11px] text-stone-700 dark:text-stone-300">
            {link}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link).then(
                () => {
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2500);
                },
                () => setCopiado(false),
              );
            }}
            className="cursor-pointer shrink-0 min-h-11 rounded-xl bg-stone-900 dark:bg-stone-100 px-4 text-xs font-bold text-white dark:text-stone-900 transition-opacity hover:opacity-90"
          >
            {copiado ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      )}

      {link && (
        <p className="mt-2 text-[11px] opacity-80">
          Link de uso único. Mande pelo WhatsApp — enquanto não houver domínio próprio,
          o e-mail automático não chega a quem não é dono da conta do Resend.
        </p>
      )}
    </div>
  );
}

function LinhaCliente({ cliente }: { cliente: ClienteAdmin }) {
  const [aberto, setAberto] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const [estadoNome, acaoNome, salvandoNome] = useActionState<EstadoForm, FormData>(renomearBar, null);
  const [estadoSusp, acaoSusp, mudandoSusp] = useActionState<EstadoForm, FormData>(alternarSuspensao, null);
  const [estadoLink, acaoLink, enviandoLink] = useActionState<EstadoForm, FormData>(gerarLinkDeAcesso, null);
  const [estadoExcluir, acaoExcluir, excluindo] = useActionState<EstadoForm, FormData>(excluirCliente, null);

  const saude = saudeDoCliente(cliente);

  return (
    <li className="px-5 sm:px-6 py-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="cursor-pointer flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
              {cliente.nome}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${saude.classe}`}
            >
              {saude.rotulo}
            </span>
            {!cliente.email_confirmado && (
              <span className="rounded-full border border-stone-300 dark:border-stone-700 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-500">
                e-mail não confirmado
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-stone-600 dark:text-stone-300">
            {cliente.owner_email ?? "sem e-mail"}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
            {saude.detalhe}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            {cliente.total_comandas} comanda{cliente.total_comandas === 1 ? "" : "s"}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            {cliente.total_produtos} produto{cliente.total_produtos === 1 ? "" : "s"}
          </p>
          <span className="mt-1 inline-block text-[11px] font-bold text-amber-700 dark:text-amber-400">
            {aberto ? "fechar ▲" : "gerenciar ▼"}
          </span>
        </div>
      </button>

      {aberto && (
        <div className="mt-4 space-y-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 p-4">
          <dl className="grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
            {[
              ["Cliente desde", formatarDataHora(cliente.created_at)],
              ["Último acesso", cliente.ultimo_login ? formatarDataHora(cliente.ultimo_login) : "nunca"],
              [
                "Última comanda",
                cliente.ultima_atividade ? formatarDataHora(cliente.ultima_atividade) : "nenhuma",
              ],
              ["Comandas abertas agora", String(cliente.comandas_abertas)],
            ].map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {rotulo}
                </dt>
                <dd className="mt-0.5 text-stone-800 dark:text-stone-200">{valor}</dd>
              </div>
            ))}
          </dl>

          {/* Renomear */}
          <form action={acaoNome} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="bar_id" value={cliente.id} />
            <label className="flex-1 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Nome do bar
              <input
                name="bar_nome"
                defaultValue={cliente.nome}
                required
                maxLength={120}
                className={`mt-1 ${CAMPO}`}
              />
            </label>
            <button
              type="submit"
              disabled={salvandoNome}
              className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 px-4 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 transition-colors disabled:opacity-60"
            >
              Salvar nome
            </button>
            {/* Cada aviso fica colado no controle que o gerou. Uma caixa de
                mensagem compartilhada obriga a escolher qual das quatro ações
                mostrar, e a escolhida acaba sendo a errada: no QA, renomear
                salvou no banco e a tela seguiu exibindo o link gerado antes. */}
            {estadoNome && (
              <div className="w-full">
                <Aviso estado={estadoNome} />
              </div>
            )}
          </form>

          <div className="flex flex-wrap gap-2">
            <form action={acaoLink}>
              <input type="hidden" name="email" value={cliente.owner_email ?? ""} />
              <button
                type="submit"
                disabled={enviandoLink || !cliente.owner_email}
                className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 px-4 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 transition-colors disabled:opacity-60"
              >
                Gerar link de acesso
              </button>
            </form>

            <form action={acaoSusp}>
              <input type="hidden" name="owner_id" value={cliente.owner_id} />
              <input type="hidden" name="suspender" value={cliente.suspenso ? "0" : "1"} />
              <button
                type="submit"
                disabled={mudandoSusp}
                className={`cursor-pointer min-h-11 rounded-xl border px-4 text-xs font-bold transition-colors disabled:opacity-60 ${
                  cliente.suspenso
                    ? "border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    : "border-amber-300 dark:border-amber-900 text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                }`}
              >
                {cliente.suspenso ? "Reativar acesso" : "Suspender acesso"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setConfirmandoExclusao((v) => !v)}
              className="cursor-pointer min-h-11 rounded-xl border border-rose-300 dark:border-rose-900 px-4 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              {confirmandoExclusao ? "Cancelar exclusão" : "Excluir cliente"}
            </button>
          </div>

          {estadoLink && <Aviso estado={estadoLink} />}
          {estadoSusp && <Aviso estado={estadoSusp} />}

          {confirmandoExclusao && (
            <form
              action={acaoExcluir}
              className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 p-4"
            >
              <input type="hidden" name="bar_id" value={cliente.id} />
              <input type="hidden" name="owner_id" value={cliente.owner_id} />
              <input type="hidden" name="bar_nome" value={cliente.nome} />

              <p className="text-xs leading-relaxed text-rose-900 dark:text-rose-300">
                Isso apaga <strong>a conta, o bar, as {cliente.total_comandas} comandas, os{" "}
                {cliente.total_produtos} produtos, os lançamentos, os pagamentos e as fotos</strong>.
                Não tem desfazer. Se a ideia é só cortar o acesso, use <em>Suspender</em>.
              </p>

              <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider text-rose-900 dark:text-rose-300">
                Digite <span className="font-black">{cliente.nome}</span> para confirmar
                <input name="confirmacao" required autoComplete="off" className={`mt-1 ${CAMPO}`} />
              </label>

              <button
                type="submit"
                disabled={excluindo}
                className="cursor-pointer mt-3 min-h-11 w-full rounded-xl bg-rose-700 hover:bg-rose-800 px-6 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-60 sm:w-auto"
              >
                {excluindo ? <LoadingButeco /> : "Excluir definitivamente"}
              </button>
            </form>
          )}

          {estadoExcluir && <Aviso estado={estadoExcluir} />}
        </div>
      )}
    </li>
  );
}
