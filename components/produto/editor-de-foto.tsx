"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Editor de foto do produto: arrastar, dar zoom e girar antes de salvar.
 *
 * Antes o recorte era automático e central, então uma garrafa fora do centro
 * simplesmente saía cortada e o dono não tinha o que fazer. Aqui ele enquadra
 * com o dedo.
 *
 * Escolhas feitas por causa de celular velho, que é onde isso vai rodar:
 *
 * - **Touch Events, não Pointer Events.** O Safari do iOS só ganhou Pointer
 *   Events no iOS 13; um iPhone 6s parado no iOS 12 ficaria sem arrastar.
 *   Touch Event funciona desde sempre.
 * - **Canvas 2D puro, sem biblioteca.** Nenhum quilobyte a mais para baixar
 *   numa rede de bar, e nada que dependa de API recente.
 * - **Buffer do preview limitado a 2x.** Celular antigo tem pouca memória de
 *   GPU; redesenhar um canvas gigante a cada toque engasga.
 * - **Botão de girar em passos de 90°**, que além de enquadrar resolve foto
 *   deitada por orientação EXIF errada — comum em Android antigo.
 *
 * A saída é um canvas sem EXIF, então o `.rotate()` do sharp no servidor vira
 * no-op e não desfaz o giro escolhido aqui.
 */

const LADO_PREVIEW = 300;
const LADO_SAIDA = 800;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

type Deslocamento = { x: number; y: number };

export function EditorDeFoto({
  arquivo,
  aoConfirmar,
  aoCancelar,
}: {
  arquivo: File;
  aoConfirmar: (recorte: Blob) => void;
  aoCancelar: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagemRef = useRef<HTMLImageElement | null>(null);

  const [pronta, setPronta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);
  // Espelhar é diferente de girar: girar roda a foto, espelhar troca o lado.
  // Rótulo escrito ao contrário, foto tirada pela câmera frontal, garrafa que
  // ficou com a etiqueta para o lado errado — nada disso se resolve girando.
  const [espelhoX, setEspelhoX] = useState(false);
  const [espelhoY, setEspelhoY] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [deslocamento, setDeslocamento] = useState<Deslocamento>({ x: 0, y: 0 });

  // Guardados em ref: mudam a cada frame do gesto e não devem provocar render.
  const gesto = useRef<{
    arrastando: boolean;
    inicioX: number;
    inicioY: number;
    deslocInicial: Deslocamento;
    distanciaInicial: number;
    zoomInicial: number;
  }>({
    arrastando: false,
    inicioX: 0,
    inicioY: 0,
    deslocInicial: { x: 0, y: 0 },
    distanciaInicial: 0,
    zoomInicial: 1,
  });

  /** Carrega o arquivo escolhido numa <img> para poder desenhar no canvas. */
  useEffect(() => {
    const url = URL.createObjectURL(arquivo);
    const img = new window.Image();

    img.onload = () => {
      imagemRef.current = img;
      setPronta(true);
    };
    img.onerror = () => setErro("Não consegui abrir essa imagem. Tente outra foto.");
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  /**
   * Escala mínima para a foto cobrir o quadrado inteiro. É o `1` do zoom:
   * abaixo disso sobraria canto vazio no recorte.
   */
  const escalaBase = useCallback(
    (lado: number) => {
      const img = imagemRef.current;
      if (!img) return 1;

      const deitada = giro === 90 || giro === 270;
      const largura = deitada ? img.naturalHeight : img.naturalWidth;
      const altura = deitada ? img.naturalWidth : img.naturalHeight;

      return lado / Math.min(largura, altura);
    },
    [giro],
  );

  /** Limite de arrasto: até onde dá para puxar sem descobrir o quadrado. */
  const limiteDeArrasto = useCallback(
    (lado: number) => {
      const img = imagemRef.current;
      if (!img) return { x: 0, y: 0 };

      const escala = escalaBase(lado) * zoom;
      const deitada = giro === 90 || giro === 270;
      const largura = (deitada ? img.naturalHeight : img.naturalWidth) * escala;
      const altura = (deitada ? img.naturalWidth : img.naturalHeight) * escala;

      return {
        x: Math.max(0, (largura - lado) / 2),
        y: Math.max(0, (altura - lado) / 2),
      };
    },
    [escalaBase, giro, zoom],
  );

  /** Desenha o estado atual num canvas de lado arbitrário (preview ou saída). */
  const desenhar = useCallback(
    (ctx: CanvasRenderingContext2D, lado: number, proporcao: number) => {
      const img = imagemRef.current;
      if (!img) return;

      ctx.save();
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(0, 0, lado, lado);

      const escala = escalaBase(lado) * zoom;

      // O limite é aplicado aqui, na hora de desenhar, e não guardado no
      // estado. Assim o preview e o recorte final usam exatamente a mesma
      // conta, e diminuir o zoom não precisa reescrever o deslocamento —
      // ele volta a valer quando couber de novo.
      const limite = limiteDeArrasto(LADO_PREVIEW);
      const dx = Math.max(-limite.x, Math.min(limite.x, deslocamento.x));
      const dy = Math.max(-limite.y, Math.min(limite.y, deslocamento.y));

      ctx.translate(lado / 2 + dx * proporcao, lado / 2 + dy * proporcao);
      ctx.rotate((giro * Math.PI) / 180);
      // Depois de transladar e girar: assim o arrasto continua seguindo o dedo
      // na direção da tela, mesmo com a foto espelhada.
      ctx.scale(espelhoX ? -1 : 1, espelhoY ? -1 : 1);

      const largura = img.naturalWidth * escala;
      const altura = img.naturalHeight * escala;
      ctx.drawImage(img, -largura / 2, -altura / 2, largura, altura);

      ctx.restore();
    },
    [deslocamento.x, deslocamento.y, escalaBase, espelhoX, espelhoY, giro, limiteDeArrasto, zoom],
  );

  /** Redesenha o preview sempre que algum controle muda. */
  useEffect(() => {
    if (!pronta) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Teto de 2x: celular antigo não dá conta de redesenhar um buffer maior a
    // cada movimento do dedo.
    const densidade = Math.min(window.devicePixelRatio || 1, 2);
    const buffer = Math.round(LADO_PREVIEW * densidade);

    if (canvas.width !== buffer) {
      canvas.width = buffer;
      canvas.height = buffer;
    }

    const ctx = canvas.getContext("2d");
    if (ctx) desenhar(ctx, buffer, densidade);
  }, [pronta, desenhar]);

  function aplicarDeslocamento(x: number, y: number) {
    const limite = limiteDeArrasto(LADO_PREVIEW);
    setDeslocamento({
      x: Math.max(-limite.x, Math.min(limite.x, x)),
      y: Math.max(-limite.y, Math.min(limite.y, y)),
    });
  }

  function distanciaEntre(toques: React.TouchList) {
    const dx = toques[0].clientX - toques[1].clientX;
    const dy = toques[0].clientY - toques[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function aoTocar(evento: React.TouchEvent<HTMLCanvasElement>) {
    evento.preventDefault();

    if (evento.touches.length === 2) {
      gesto.current.arrastando = false;
      gesto.current.distanciaInicial = distanciaEntre(evento.touches);
      gesto.current.zoomInicial = zoom;
      return;
    }

    const toque = evento.touches[0];
    gesto.current.arrastando = true;
    gesto.current.inicioX = toque.clientX;
    gesto.current.inicioY = toque.clientY;
    gesto.current.deslocInicial = deslocamento;
  }

  function aoMover(evento: React.TouchEvent<HTMLCanvasElement>) {
    evento.preventDefault();

    if (evento.touches.length === 2 && gesto.current.distanciaInicial > 0) {
      const proporcao = distanciaEntre(evento.touches) / gesto.current.distanciaInicial;
      const novo = gesto.current.zoomInicial * proporcao;
      setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, novo)));
      return;
    }

    if (!gesto.current.arrastando) return;

    const toque = evento.touches[0];
    aplicarDeslocamento(
      gesto.current.deslocInicial.x + (toque.clientX - gesto.current.inicioX),
      gesto.current.deslocInicial.y + (toque.clientY - gesto.current.inicioY),
    );
  }

  function aoSoltar() {
    gesto.current.arrastando = false;
    gesto.current.distanciaInicial = 0;
  }

  // Mouse, para quem cadastra produto pelo computador do caixa.
  function aoPressionarMouse(evento: React.MouseEvent<HTMLCanvasElement>) {
    gesto.current.arrastando = true;
    gesto.current.inicioX = evento.clientX;
    gesto.current.inicioY = evento.clientY;
    gesto.current.deslocInicial = deslocamento;
  }

  function aoMoverMouse(evento: React.MouseEvent<HTMLCanvasElement>) {
    if (!gesto.current.arrastando) return;
    aplicarDeslocamento(
      gesto.current.deslocInicial.x + (evento.clientX - gesto.current.inicioX),
      gesto.current.deslocInicial.y + (evento.clientY - gesto.current.inicioY),
    );
  }

  function girar() {
    setGiro((atual) => (atual + 90) % 360);
  }

  function espelharHorizontal() {
    setEspelhoX((atual) => !atual);
  }

  function espelharVertical() {
    setEspelhoY((atual) => !atual);
  }

  function confirmar() {
    const img = imagemRef.current;
    if (!img) return;

    const saida = document.createElement("canvas");
    saida.width = LADO_SAIDA;
    saida.height = LADO_SAIDA;

    const ctx = saida.getContext("2d");
    if (!ctx) {
      setErro("Este navegador não consegue processar a imagem.");
      return;
    }

    // A mesma proporção do preview, para o recorte final sair exatamente igual
    // ao que a pessoa enquadrou na tela.
    desenhar(ctx, LADO_SAIDA, LADO_SAIDA / LADO_PREVIEW);

    saida.toBlob(
      (blob) => {
        if (blob) aoConfirmar(blob);
        else setErro("Não consegui gerar a imagem recortada.");
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-stone-500 dark:text-stone-400">
        Arraste para enquadrar, use dois dedos ou a barra para o zoom, e gire se a
        foto estiver deitada.
      </p>

      <div className="mx-auto" style={{ width: LADO_PREVIEW, maxWidth: "100%" }}>
        <canvas
          ref={canvasRef}
          onTouchStart={aoTocar}
          onTouchMove={aoMover}
          onTouchEnd={aoSoltar}
          onTouchCancel={aoSoltar}
          onMouseDown={aoPressionarMouse}
          onMouseMove={aoMoverMouse}
          onMouseUp={aoSoltar}
          onMouseLeave={aoSoltar}
          className="w-full rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-900 cursor-move select-none"
          style={{ aspectRatio: "1 / 1", touchAction: "none" }}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-stone-500 dark:text-stone-400 w-10 shrink-0">
          Zoom
        </span>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom da foto"
          className="flex-1 cursor-pointer accent-amber-700 dark:accent-amber-500 h-6"
        />
      </div>

      {/* Girar e espelhar em linha própria: no celular os três não cabiam ao
          lado do zoom sem apertar o alvo de toque abaixo dos 44px. */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={girar}
          aria-label="Girar a foto 90 graus"
          className="cursor-pointer flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2.5 text-xs font-bold text-stone-800 dark:text-stone-200 active:scale-95 transition-transform"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          </svg>
          Girar
        </button>

        <button
          type="button"
          onClick={espelharHorizontal}
          aria-pressed={espelhoX}
          aria-label="Espelhar a foto na horizontal"
          className={`cursor-pointer flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold active:scale-95 transition-transform ${
            espelhoX
              ? "border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300"
              : "border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v18" />
            <path d="M8 7L4 12l4 5" />
            <path d="M16 7l4 5-4 5" />
          </svg>
          Espelhar
        </button>

        <button
          type="button"
          onClick={espelharVertical}
          aria-pressed={espelhoY}
          aria-label="Virar a foto de cabeça para baixo"
          className={`cursor-pointer flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold active:scale-95 transition-transform ${
            espelhoY
              ? "border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300"
              : "border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12h18" />
            <path d="M7 8l5-4 5 4" />
            <path d="M7 16l5 4 5-4" />
          </svg>
          Virar
        </button>
      </div>

      {erro && (
        <p role="alert" className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-xs text-rose-900 dark:text-rose-200">
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={aoCancelar}
          className="cursor-pointer flex-1 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3.5 text-sm font-bold text-stone-700 dark:text-stone-200 active:scale-95 transition-transform"
        >
          Trocar foto
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={!pronta}
          // Verde e não âmbar: aqui o âmbar é a cor de "ação principal" e
          // aparece em todo botão da tela. Neste par o que importa é a
          // diferença entre confirmar e voltar atrás — verde lê como "pronto,
          // é essa" antes mesmo de ler o texto.
          className="cursor-pointer flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-4 py-3.5 text-sm font-bold text-white shadow-xs active:scale-95 transition-transform disabled:opacity-50"
        >
          Usar esta foto
        </button>
      </div>
    </div>
  );
}
