/**
 * Content-Security-Policy do ButecoApp.
 *
 * A política é montada aqui e aplicada no proxy (ver proxy.ts), que gera um
 * nonce novo a cada requisição. O Next.js lê o nonce do cabeçalho da requisição
 * e o carimba nos próprios <script> (runtime, chunks, hidratação); o que
 * sobra — o registro do service worker no layout — recebe o nonce à mão.
 *
 * O que a política permite, e por quê:
 *
 *   script-src   só scripts com o nonce desta resposta ('strict-dynamic'
 *                estende a confiança ao que ELES criam via createElement:
 *                o Turnstile e os scripts de Analytics/Speed Insights entram
 *                por aí). Um <script> injetado por XSS não tem nonce e morre.
 *   style-src    'unsafe-inline' porque a interface usa style={} inline
 *                (miniatura, editor de foto, campo-armadilha). CSS injetado
 *                é bem menos perigoso que script, e o nonce não cobre
 *                atributo style.
 *   img-src      próprio domínio (next/image), blob: (editor de foto) e o
 *                Storage do Supabase (foto do produto sem otimização).
 *   connect-src  só o próprio domínio: o navegador não fala com o Supabase
 *                direto — tudo passa pelo servidor.
 *   frame-src    o iframe do Turnstile, e mais nenhum.
 *   frame-ancestors 'none': ninguém embute o app em iframe (clickjacking).
 *   form-action  o próprio domínio e o começo do OAuth do Google, para o
 *                envio do formulário sem JavaScript continuar funcionando.
 *
 * Em desenvolvimento entram 'unsafe-eval' (o React usa eval para remontar
 * stack de erro) e ws: (HMR). Nada disso vai para produção.
 */
export function montarCsp(nonce: string, desenvolvimento: boolean) {
  const supabase = origemDoSupabase();

  const diretivas = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data:${supabase ? ` ${supabase}` : ""}`,
    "font-src 'self'",
    `connect-src 'self'${desenvolvimento ? " ws: wss:" : ""}`,
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' https://accounts.google.com${supabase ? ` ${supabase}` : ""}`,
    "frame-ancestors 'none'",
  ];

  if (!desenvolvimento) diretivas.push("upgrade-insecure-requests");

  return diretivas.join("; ");
}

function origemDoSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Nonce de 128 bits, base64 — o formato que o Next.js procura no cabeçalho. */
export function gerarNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
