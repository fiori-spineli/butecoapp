/**
 * O campo-armadilha do formulário de interesse (honeypot).
 *
 * Mora num módulo próprio porque o formulário e a server action precisam do
 * mesmo nome, e um arquivo "use server" só pode exportar função assíncrona —
 * uma constante ali quebra o build.
 *
 * "site" porque robô de formulário preenche qualquer coisa que pareça campo de
 * link, e porque nenhum gerenciador de senha preenche isso sozinho. Esse é o
 * jeito clássico de um honeypot descartar gente de verdade por engano: dar a
 * ele um nome que o navegador conhece, como "sobrenome" ou "empresa".
 */
export const CAMPO_ARMADILHA = "site";

/** Some da tela, do Tab e do leitor de tela — mas continua no DOM, que é onde o robô olha. */
export const ESTILO_ARMADILHA = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden" as const,
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
};
