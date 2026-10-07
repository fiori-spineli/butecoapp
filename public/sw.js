// Service worker do ButecoApp — só arquivos estáticos, nunca HTML nem API.
//
// Página e dados de bar/comanda NÃO passam por aqui: são privados e têm de vir
// frescos do servidor. O que fica em cache:
//
//   /_next/static/*   nome com hash: o conteúdo nunca muda sob o mesmo nome,
//                     então cache-first é seguro. Teto de entradas, porque cada
//                     deploy traz chunks novos e os velhos se acumulavam sem fim.
//   ícones, logo e    nome FIXO: com cache-first a versão nova nunca chegava a
//   manifesto         quem já tinha o app instalado. Rede primeiro; o cache só
//                     responde quando não há rede.
//
// Trocar a VERSAO apaga os caches anteriores na ativação.
const VERSAO = "v2";
const CACHE_ESTATICO = `butecoapp-${VERSAO}-static`;
const CACHE_FIXOS = `butecoapp-${VERSAO}-fixos`;
const LIMITE_ESTATICO = 150;

const ARQUIVOS_FIXOS = [
  "/icone-512.png",
  "/icone-512.webp",
  "/buteco_logo.webp",
  "/buteco_logo_clear.webp",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_FIXOS).then((cache) => cache.addAll(ARQUIVOS_FIXOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((key) => key !== CACHE_ESTATICO && key !== CACHE_FIXOS)
        .map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

async function aparar(cache) {
  const chaves = await cache.keys();
  // Cache.keys() devolve na ordem de inserção: sai o mais antigo.
  for (const chave of chaves.slice(0, Math.max(0, chaves.length - LIMITE_ESTATICO))) {
    await cache.delete(chave);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_ESTATICO);
  const guardado = await cache.match(request);
  if (guardado) return guardado;
  const resposta = await fetch(request);
  if (resposta && resposta.status === 200) {
    await cache.put(request, resposta.clone());
    aparar(cache);
  }
  return resposta;
}

async function redePrimeiro(request) {
  const cache = await caches.open(CACHE_FIXOS);
  try {
    const resposta = await fetch(request);
    if (resposta && resposta.status === 200) cache.put(request, resposta.clone());
    return resposta;
  } catch (erro) {
    const guardado = await cache.match(request);
    if (guardado) return guardado;
    throw erro;
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event.request));
  } else if (ARQUIVOS_FIXOS.includes(url.pathname)) {
    event.respondWith(redePrimeiro(event.request));
  }
});
