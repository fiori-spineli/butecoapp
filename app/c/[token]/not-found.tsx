export default function ContaNaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-8 text-center">
      <h1 className="text-xl font-bold">Conta indisponível</h1>
      <p className="mt-2.5 text-sm leading-relaxed text-stone-500">
        Esse link não existe ou já expirou. Contas fechadas ficam acessíveis por 24 horas como
        comprovante — depois disso, o link deixa de funcionar.
      </p>
      <p className="mt-6 text-xs text-stone-400">
        Precisa consultar de novo? Peça o QR Code ao dono do bar.
      </p>
    </main>
  );
}
