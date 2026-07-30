/* Офлайн-режим домашней бухгалтерии.
   Стратегия та же, что в кулинарной книге:
   - HTML/JS (сама программа) — "сеть вперёд": при наличии интернета берём свежую версию,
     без сети — из кэша. Приложение обновляется само, без чистки кэша вручную.
   - Иконки/манифест — "кэш вперёд": не меняются, грузятся мгновенно и офлайн.
   Отличие от кулинарной книги: в кэш кладём только успешные ответы (resp.ok). */
const CACHE = "budget-v3";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./jsQR.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // Иконки могут отсутствовать на этапе разработки — не роняем установку из-за них.
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAppShell(req) {
  const url = new URL(req.url);
  return req.mode === "navigate" ||
         url.pathname.endsWith("/") ||
         url.pathname.endsWith("index.html");
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  if (isAppShell(e.request)) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put("./index.html", copy));
          }
          return resp;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached =>
      cached ||
      fetch(e.request).then(resp => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached)
    )
  );
});
