"use client";

import { useState } from "react";
import Link from "next/link";
import { MfaGate } from "./mfa-gate";
import { TemaToggle } from "@/components/tema-toggle";
import { LogoButeco } from "@/components/logo-buteco";
import { BotaoSair } from "@/components/botao-sair";
import { AcoesAdmin } from "./acoes-admin";
import { formatarReais, formatarDataHora } from "@/lib/format";
import type { StatusMFA } from "@/app/actions/mfa";

export function AdminViewContainer({
    statusMfa,
    metricas,
}: {
    statusMfa: StatusMFA;
    metricas: any;
}) {
    const [desbloqueado, setDesbloqueado] = useState(
        statusMfa.temFatorAtivo && !statusMfa.precisaVerificar
    );

    // Se o 2FA ainda não foi validado, exibe a tela de Admin com a Logo em destaque e o Botão Sair
    if (!desbloqueado) {
        return (
            <div className="flex min-h-[90vh] flex-col items-center justify-center">
                {/* Topo com Logo Grande, Tema e Sair */}
                <div className="mb-8 flex items-center justify-between w-full max-w-md px-2">
                    <LogoButeco className="w-44 md:w-56 h-16 md:h-20" priority />
                    <div className="flex items-center gap-3">
                        <TemaToggle />
                        <BotaoSair />
                    </div>
                </div>
                <MfaGate
                    statusInicial={statusMfa}
                    onSucesso={() => setDesbloqueado(true)}
                />
            </div>
        );
    }

    if (!metricas) {
        return (
            <div className="p-10 text-center text-sm text-stone-500">
                Não foi possível carregar as métricas de infraestrutura.
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl flex flex-col gap-8 animate-in fade-in duration-200">
            {/* Topo do Painel de Admin Desbloqueado */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <LogoButeco className="w-36 md:w-52 lg:w-64 h-14 md:h-20 lg:h-24" priority />
                    <div className="sm:border-l border-stone-300 dark:border-stone-700 sm:pl-4">
                        <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">
                                Sessão Protegida com 2FA
                            </span>
                        </div>
                        <h1 className="text-xl md:text-3xl font-black tracking-tight mt-0.5">
                            Infraestrutura & Negócio
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                    <TemaToggle />
                    <BotaoSair />
                </div>
            </header>

            {/* 1. SEÇÃO: SAÚDE DO SERVIDOR E BANCO DE DADOS */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700 dark:text-amber-400" aria-hidden>
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                        <line x1="6" y1="6" x2="6.01" y2="6" />
                        <line x1="6" y1="18" x2="6.01" y2="18" />
                    </svg>
                    <h2 className="text-sm font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Telemetria da Infraestrutura
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <CardMetrica
                        rotulo="Uso de Disco (DB)"
                        valor={metricas.infra.tamanho_banco}
                        detalhe="Tamanho total no PostgreSQL"
                    />
                    <CardMetrica
                        rotulo="Conexões Ativas"
                        valor={String(metricas.infra.conexoes_ativas)}
                        detalhe="Pooler e requisições concorrentes"
                    />
                    <CardMetrica
                        rotulo="Total de Usuários (Auth)"
                        valor={String(metricas.infra.total_usuarios)}
                        detalhe="Contas cadastradas no auth.users"
                    />
                    <CardMetrica
                        rotulo="PostgreSQL Engine"
                        valor="v17 AWS Cloud"
                        detalhe={metricas.infra.versao_postgres.split(" ")[0]}
                    />
                </div>
            </section>

            {/* 2. SEÇÃO: MÉTRICAS GLOBAIS DE NEGÓCIO */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700 dark:text-amber-400" aria-hidden>
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <h2 className="text-sm font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Volume Geral do Ecossistema
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <CardMetrica
                        rotulo="Bares Cadastrados"
                        valor={String(metricas.negocio.total_bares)}
                        detalhe="Total de estabelecimentos ativos"
                    />
                    <CardMetrica
                        rotulo="Produtos no Catálogo"
                        valor={String(metricas.negocio.total_produtos)}
                        detalhe="Itens cadastrados na plataforma"
                    />
                    <CardMetrica
                        rotulo="Comandas no Salão"
                        valor={`${metricas.negocio.comandas_abertas} abertas`}
                        detalhe={`${metricas.negocio.comandas_fechadas} contas já encerradas`}
                    />
                    <CardMetrica
                        rotulo="Volume Financeiro Registrado"
                        valor={formatarReais(metricas.negocio.volume_total_centavos)}
                        detalhe="Total contábil transitado pelo app"
                    />
                </div>
            </section>

            {/* 3. SEÇÃO: MANUTENÇÃO REMOTA */}
            <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                    Manutenção Remota do Banco de Dados
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 max-w-xl">
                    Permite reciclar estatísticas e conexões do PostgreSQL remotamente.
                </p>
                <AcoesAdmin />
            </section>

            {/* 4. SEÇÃO: AUDITORIA DE BARES */}
            <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
                <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                            Lista de Bares Cadastrados
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            Auditoria de estabelecimentos e proprietários
                        </p>
                    </div>
                    <span className="text-xs font-bold rounded-lg bg-stone-100 dark:bg-stone-800 px-3 py-1 text-stone-600 dark:text-stone-300">
                        {metricas.bares.length} bares
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800 font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Nome do Bar</th>
                                <th className="px-6 py-3">E-mail do Dono</th>
                                <th className="px-6 py-3">Produtos</th>
                                <th className="px-6 py-3">Comandas</th>
                                <th className="px-6 py-3">Criado em</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80 text-stone-800 dark:text-stone-200">
                            {metricas.bares.map((b: any) => (
                                <tr key={b.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                                    <td className="px-6 py-4 font-bold text-sm">
                                        {b.nome}
                                        <span className="block text-[11px] font-mono font-normal text-stone-400 mt-0.5">
                                            /{b.slug}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-stone-600 dark:text-stone-300">
                                        {b.owner_email || "E-mail não vinculado"}
                                    </td>
                                    <td className="px-6 py-4 font-black tabular-nums">
                                        {b.total_produtos}
                                    </td>
                                    <td className="px-6 py-4 font-black tabular-nums">
                                        {b.total_comandas}
                                    </td>
                                    <td className="px-6 py-4 text-stone-500">
                                        {formatarDataHora(b.created_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function CardMetrica({
    rotulo,
    valor,
    detalhe,
}: {
    rotulo: string;
    valor: string;
    detalhe: string;
}) {
    return (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {rotulo}
            </span>
            <p className="mt-2 text-2xl md:text-3xl font-black tabular-nums text-stone-900 dark:text-stone-100">
                {valor}
            </p>
            <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500">
                {detalhe}
            </p>
        </div>
    );
}