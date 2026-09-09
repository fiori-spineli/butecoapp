self.addEventListener("fetch", (event) => {
  // Service worker básico para atender aos requisitos de PWA
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});