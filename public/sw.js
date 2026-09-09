// Service worker mínimo: existe para o app poder ser instalado na tela inicial.
//
// A versão anterior chamava event.respondWith(fetch(...)) em TODA requisição —
// inclusive navegação e POST de server action. Isso é um problema concreto:
// quando o service worker devolve uma resposta redirecionada para um pedido de
// navegação, o navegador recusa ("a redirected response was used for a request
// whose redirect mode is not follow"), e é exatamente o que o /auth/callback
// faz ao trocar o token do e-mail por sessão. Fora isso, o cache nunca era
// preenchido, então o fallback caches.match() só podia devolver undefined.
//
// Aqui não interceptamos nada: sem respondWith, o navegador cuida do pedido
// como cuidaria sem service worker nenhum. Continua instalável, e nada no
// caminho de login pode ser corrompido por um intermediário.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Proposital: sem respondWith. Ver o comentário acima.
});
