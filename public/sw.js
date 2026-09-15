const CACHE_NAME = "butecoapp-v1-static";

const ARQUIVOS_CACHE = [
  "/icone-512.png",
  "/icone-512.webp",
  "/buteco_logo.webp",
  "/buteco_logo_clear.webp",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARQUIVOS_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia Cache-First: se está no cache, entrega na hora em 0ms sem tocar na internet
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Intercepta imagens locais e manifesto
  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".webmanifest") ||
      url.pathname.includes("/_next/static/"))
  ) {
    event.respondWith(
      caches.match(event.request).then((respostaCache) => {
        if (respostaCache) {
          return respostaCache;
        }
        return fetch(event.request).then((respostaRede) => {
          if (respostaRede && respostaRede.status === 200) {
            const clone = respostaRede.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return respostaRede;
        });
      })
    );
  }
});