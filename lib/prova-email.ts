import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * "Este navegador acabou de provar que tem o e-mail desta conta."
 *
 * É o que autoriza a tela /nova-senha a gravar uma senha. Quem grava este
 * cookie são só as duas portas da recuperação — o código de 8 dígitos e o link
 * do e-mail — no instante em que o Auth aceitou a prova.
 *
 * Por que não bastar o `amr` do JWT (lib/recuperacao.ts): o rótulo que o Auth
 * põe na sessão depende do caminho. Medido: código e token_hash dão `otp`. O
 * `?code=` do PKCE eu não consegui medir sem um e-mail de verdade — e se ele
 * viesse com outro rótulo, quem abrisse o link ficaria preso sem conseguir
 * criar a senha. Este cookie não depende de rótulo nenhum: é nosso, é
 * assinado, amarra o id do usuário e vence sozinho.
 */

const COOKIE = "buteco_prova_email";
const VALIDADE_EM_SEGUNDOS = 15 * 60;

/**
 * A chave de serviço já é o segredo mais bem guardado do servidor; derivar a
 * assinatura dela com um rótulo próprio evita uma variável de ambiente a mais
 * para esquecer de configurar — que foi o destino do IP_HASH_SALT.
 */
function chave(): Buffer | null {
  const segredo = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!segredo) return null;
  return createHmac("sha256", segredo).update("buteco:prova-email:v1").digest();
}

function assinar(conteudo: string, k: Buffer): string {
  return createHmac("sha256", k).update(conteudo).digest("base64url");
}

export async function registrarProvaDeEmail(userId: string): Promise<void> {
  const k = chave();
  if (!k) return;

  const expira = Math.floor(Date.now() / 1000) + VALIDADE_EM_SEGUNDOS;
  const conteudo = `${userId}.${expira}`;

  (await cookies()).set(COOKIE, `${conteudo}.${assinar(conteudo, k)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VALIDADE_EM_SEGUNDOS,
  });
}

export async function provaDeEmailValida(userId: string): Promise<boolean> {
  const k = chave();
  if (!k) return false;

  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return false;

  const partes = valor.split(".");
  if (partes.length !== 3) return false;
  const [dono, expiraTexto, assinatura] = partes;

  const esperada = Buffer.from(assinar(`${dono}.${expiraTexto}`, k));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return false;

  return dono === userId && Number(expiraTexto) > Math.floor(Date.now() / 1000);
}

/** Depois de gravar a senha a prova já cumpriu o papel — não fica sobrando. */
export async function descartarProvaDeEmail(): Promise<void> {
  try {
    (await cookies()).delete(COOKIE);
  } catch {
    // Server Component não escreve cookie; a prova vence sozinha em 15 min.
  }
}
