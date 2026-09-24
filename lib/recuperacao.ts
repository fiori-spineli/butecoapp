import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Recuperação de senha — as peças que o servidor divide entre as telas.
 *
 * A regra que organiza tudo aqui: **recuperar a senha nunca vira login.** O
 * link ou o código do e-mail provam que a pessoa tem a caixa postal, e o único
 * lugar a que essa prova leva é a tela de criar senha nova. Antes, o link caía
 * no mesmo /auth/callback do Google, era tratado como login comum e jogava a
 * pessoa no painel sem nunca pedir a senha nova — ela saía de lá com a mesma
 * senha que não lembrava, e voltava a ser recusada no login seguinte.
 */

/**
 * Para onde o e-mail de recuperação manda.
 *
 * Rota própria, e não o /auth/callback: é ela que diz "isto é recuperação"
 * sem depender de adivinhar pelo formato da URL — o `?code=` que chega aqui é
 * idêntico ao do Google. A allow list do projeto (`https://butecoapp.vercel.app/**`)
 * cobre este caminho; conferido pelo `redirect_to` que o Auth devolve.
 */
export const ROTA_RECUPERACAO = "/auth/recuperar";

/**
 * Quanto tempo depois de provar o e-mail a pessoa ainda pode gravar a senha.
 *
 * Passado isso, a sessão continua valendo para usar o app, mas trocar a senha
 * volta a exigir um código novo. É o que impede o celular esquecido logado no
 * balcão de virar troca de senha — e, com ela, a conta de outra pessoa.
 */
const JANELA_DA_PROVA_EM_SEGUNDOS = 15 * 60;

/**
 * Métodos de login que só existem para quem abriu o e-mail.
 *
 * Medido no projeto: a sessão aberta pelo código (ou pelo token_hash) vem com
 * `amr = otp`. `recovery` e `magiclink` entram para cobrir a sessão que nasce
 * do `?code=` do fluxo PKCE, que o Auth rotula pelo tipo do link.
 */
const METODOS_QUE_PROVAM_O_EMAIL = new Set(["otp", "recovery", "magiclink", "email/signup"]);

type EntradaAmr = { method?: string; timestamp?: number } | string;

/**
 * A sessão atual provou, há pouco, que tem acesso ao e-mail da conta?
 *
 * Lê o `amr` das claims VERIFICADAS (getClaims confere a assinatura do JWT).
 * Mesmo que alguém forjasse o cookie, o updateUser que vem depois é conferido
 * pelo próprio Auth — isto aqui é a primeira barreira, não a única.
 */
export async function sessaoProvouOEmail(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return false;

    const agora = Math.floor(Date.now() / 1000);
    const amr = (data.claims.amr ?? []) as EntradaAmr[];

    return amr.some((entrada) => {
      if (typeof entrada === "string") return false; // sem data, não dá para medir a janela
      return (
        typeof entrada.method === "string" &&
        METODOS_QUE_PROVAM_O_EMAIL.has(entrada.method) &&
        typeof entrada.timestamp === "number" &&
        agora - entrada.timestamp <= JANELA_DA_PROVA_EM_SEGUNDOS
      );
    });
  } catch {
    return false;
  }
}

/**
 * Conta criada pelo backoffice com senha provisória.
 *
 * O admin dita a senha pelo WhatsApp; a pessoa entra com ela uma vez e é
 * levada a criar a própria. Mora em `app_metadata`, que só a chave de serviço
 * escreve — o próprio usuário não consegue desligar a exigência pela API.
 */
export function precisaTrocarSenha(usuario: Pick<User, "app_metadata"> | null | undefined): boolean {
  return usuario?.app_metadata?.trocar_senha === true;
}

/** l***s@gmail.com — mostra para onde foi sem expor o endereço inteiro na tela. */
export function mascararEmail(email: string): string {
  const [nome, dominio] = email.split("@");
  if (!nome || !dominio) return email;
  if (nome.length <= 2) return `${nome[0]}***@${dominio}`;
  return `${nome[0]}***${nome[nome.length - 1]}@${dominio}`;
}

/**
 * Só os dígitos do que a pessoa colou ou digitou.
 *
 * O código chega por e-mail e costuma ser colado com espaço, hífen ou quebra
 * de linha. O tamanho é configuração do projeto (hoje 8 dígitos, medido pelo
 * `email_otp` do generateLink); aceitar de 6 a 10 evita que uma mudança no
 * painel quebre a tela em silêncio.
 */
export function normalizarCodigo(bruto: string): string | null {
  const digitos = bruto.replace(/\D/g, "");
  return digitos.length >= 6 && digitos.length <= 10 ? digitos : null;
}
