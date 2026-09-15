export const CHAVE_TEMA = "buteco_tema";

export type PreferenciaDeTema = "claro" | "escuro" | "automatico";

export const SCRIPT_TEMA = `(function(){try{var p=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});var e=p==="escuro"||p==="dark"||((!p||p==="automatico")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList[e?"add":"remove"]("dark");}catch(_){}})();`;

/** Grava a preferência e aplica na hora. */
export function aplicarTema(preferencia: PreferenciaDeTema) {
  const escuro =
    preferencia === "escuro" ||
    (preferencia === "automatico" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", escuro);

  try {
    localStorage.setItem(CHAVE_TEMA, preferencia);
    // Dispara evento customizado para atualizar componentes síncronos na mesma aba
    window.dispatchEvent(new Event("buteco-tema-mudou"));
  } catch {
    // Sem armazenamento a escolha vale só para esta aba.
  }
}

export function lerPreferencia(): PreferenciaDeTema {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    if (salvo === "escuro" || salvo === "dark") return "escuro";
    if (salvo === "claro" || salvo === "light") return "claro";
  } catch {
    // ignora
  }
  return "automatico";
}