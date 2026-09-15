"use client";

import { formatarReais } from "@/lib/format";

type VendaMesItem = {
  total_centavos: number;
  created_at: string;
};

export function EstatisticasDashboard({ vendas }: { vendas: VendaMesItem[] }) {
  const hoje = new Date();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diaAtual = hoje.getDate();

  // 1. Processamento da Curva S (Faturamento Acumulado no Mês)
  const acumuladoPorDia: number[] = Array(diasNoMes).fill(0);
  let totalMes = 0;

  vendas.forEach((v) => {
    const dia = new Date(v.created_at).getDate();
    if (dia >= 1 && dia <= diasNoMes) {
      acumuladoPorDia[dia - 1] += v.total_centavos;
      totalMes += v.total_centavos;
    }
  });

  function calcularCurvaS(arr: number[]): number[] {
    let acc = 0;
    return arr.map((val) => {
      acc += val;
      return acc;
    });
  }

  const curvaS = calcularCurvaS(acumuladoPorDia);
  const maxCurva = Math.max(...curvaS, 100);

  // 2. Processamento por Dia da Semana (0 = Domingo, 6 = Sábado)
  const diasSemanaNomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const vendasPorDiaSemana: number[] = Array(7).fill(0);

  vendas.forEach((v) => {
    const d = new Date(v.created_at).getDay();
    vendasPorDiaSemana[d] += v.total_centavos;
  });

  const maxDiaSemana = Math.max(...vendasPorDiaSemana, 100);
  const mediaDiaria = diaAtual > 0 ? totalMes / diaAtual : 0;

  // 3. Processamento de Horários de Pico (Intervalos de 30 em 30 minutos)
  // Geramos a grade das 12:00 até as 03:00 (horário padrão de funcionamento de bar)
  const slotsPicoKeys: string[] = [];
  const picosMap: Record<string, number> = {};

  for (let h = 12; h <= 26; h++) {
    const horaReal = h % 24;
    const hStr = String(horaReal).padStart(2, "0");
    slotsPicoKeys.push(`${hStr}:00`);
    slotsPicoKeys.push(`${hStr}:30`);
  }

  vendas.forEach((v) => {
    const d = new Date(v.created_at);
    const h = d.getHours();
    const m = d.getMinutes();
    const mRounded = m < 30 ? "00" : "30";
    const chave = `${String(h).padStart(2, "0")}:${mRounded}`;
    picosMap[chave] = (picosMap[chave] || 0) + v.total_centavos;
  });

  const maxPico = Math.max(...Object.values(picosMap), 100);

  // Encontra o horário de pico mais forte para o destaque textual
  let horarioMaisForte = "N/A";
  let maiorValorPico = -1;
  Object.entries(picosMap).forEach(([horario, valor]) => {
    if (valor > maiorValorPico) {
      maiorValorPico = valor;
      horarioMaisForte = horario;
    }
  });

  const pontosSvg = curvaS
    .slice(0, Math.min(diaAtual, diasNoMes))
    .map((val, idx) => {
      const x = (idx / (diasNoMes - 1 || 1)) * 360;
      const y = 120 - (val / maxCurva) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      
      {/* CARD 1: CURVA S DE CRESCIMENTO ACUMULADO NO MÊS */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Curva S • Faturamento Acumulado no Mês
            </h3>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
              {formatarReais(totalMes)} total
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Ritmo de aceleração e ganho de receita dia após dia.
          </p>
        </div>

        <div className="my-4 relative h-36 w-full flex items-end">
          {curvaS.length === 0 || totalMes === 0 ? (
            <div className="size-full flex items-center justify-center text-xs text-stone-400 italic">
              Sem dados suficientes este mês para traçar a curva.
            </div>
          ) : (
            <svg viewBox="0 0 360 140" className="size-full overflow-visible">
              <defs>
                <linearGradient id="gradCurvaS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="20" x2="360" y2="20" stroke="currentColor" className="text-stone-200 dark:text-stone-800" strokeDasharray="4" />
              <line x1="0" y1="70" x2="360" y2="70" stroke="currentColor" className="text-stone-200 dark:text-stone-800" strokeDasharray="4" />
              <line x1="0" y1="120" x2="360" y2="120" stroke="currentColor" className="text-stone-200 dark:text-stone-800" />

              {pontosSvg && (
                <polygon
                  points={`0,120 ${pontosSvg} 360,120`}
                  fill="url(#gradCurvaS)"
                />
              )}

              {pontosSvg && (
                <polyline
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pontosSvg}
                />
              )}
            </svg>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-200 dark:border-stone-800">
          <span>Dia 1</span>
          <span className="font-semibold text-stone-700 dark:text-stone-300">
            Média diária: {formatarReais(mediaDiaria)}
          </span>
          <span>Dia {diasNoMes}</span>
        </div>
      </div>

      {/* CARD 2: SAZONALIDADE POR DIA DA SEMANA */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Sazonalidade • Vendas por Dia da Semana
          </h3>
          <p className="text-[11px] text-stone-400 mt-1">
            Descubra quais dias concentram o maior fluxo no bar.
          </p>
        </div>

        <div className="my-4 h-36 w-full flex items-end justify-between gap-1.5 pt-4">
          {diasSemanaNomes.map((dia, idx) => {
            const valorDia = vendasPorDiaSemana[idx];
            const alturaPct = maxDiaSemana > 0 ? Math.max(12, (valorDia / maxDiaSemana) * 100) : 12;
            const ehHoje = new Date().getDay() === idx;

            return (
              <div key={dia} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 text-white text-[10px] font-bold py-1 px-2 rounded-md pointer-events-none whitespace-nowrap z-10 shadow-md">
                  {formatarReais(valorDia)}
                </div>

                <div
                  style={{ height: `${alturaPct}%` }}
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    ehHoje
                      ? "bg-amber-600 dark:bg-amber-500 shadow-sm shadow-amber-500/30"
                      : "bg-stone-300 dark:bg-stone-700 hover:bg-amber-500/70"
                  }`}
                />
                <span className={`mt-2 text-[10px] font-bold ${ehHoje ? "text-amber-700 dark:text-amber-400" : "text-stone-500"}`}>
                  {dia}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-200 dark:border-stone-800">
          <span>Baseado no histórico</span>
          <span className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
            <span className="size-2 rounded-full bg-amber-600 inline-block" /> Hoje em destaque
          </span>
        </div>
      </div>

      {/* CARD 3: HORÁRIOS DE PICO DE 30 EM 30 MINUTOS */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 p-5 flex flex-col justify-between lg:col-span-1 md:col-span-2">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Horários de Pico • De 30 em 30 Minutos
            </h3>
            {maiorValorPico > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                Pico: {horarioMaisForte}
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Identifique os horários exatos de maior fluxo para dimensionar o atendimento.
          </p>
        </div>

        {/* Grade horizontal com rolagem suave para celular */}
        <div className="my-4 h-36 w-full overflow-x-auto flex items-end gap-2 pb-2 scrollbar-none">
          {slotsPicoKeys.map((slot) => {
            const valorSlot = picosMap[slot] || 0;
            const alturaPct = maxPico > 0 ? Math.max(8, (valorSlot / maxPico) * 100) : 8;
            const temMovimento = valorSlot > 0;

            return (
              <div key={slot} className="min-w-[32px] flex-1 flex flex-col items-center h-full justify-end group relative">
                {temMovimento && (
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 text-white text-[10px] font-bold py-1 px-2 rounded-md pointer-events-none whitespace-nowrap z-10 shadow-md">
                    {slot} - {formatarReais(valorSlot)}
                  </div>
                )}

                <div
                  style={{ height: `${alturaPct}%` }}
                  className={`w-full rounded-t-md transition-all duration-300 ${
                    temMovimento
                      ? "bg-amber-600 dark:bg-amber-500 hover:bg-amber-400"
                      : "bg-stone-200 dark:bg-stone-800"
                  }`}
                />
                {/* Mostra o horário de hora em hora para não poluir o celular */}
                <span className="mt-2 text-[9px] font-mono text-stone-400 whitespace-nowrap">
                  {slot.endsWith(":00") ? slot : ""}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-200 dark:border-stone-800">
          <span>Horário de funcionamento (12h às 03h)</span>
          <span className="font-semibold text-stone-700 dark:text-stone-300">
            {maiorValorPico > 0 ? `Maior pico às ${horarioMaisForte}` : "Sem dados de horário"}
          </span>
        </div>
      </div>

    </section>
  );
}