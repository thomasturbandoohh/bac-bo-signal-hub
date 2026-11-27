const CACHE_NAME = "bacbo-live-cache-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }),
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
        }),
      );
    }),
  );
  self.clients.claim();
});

/* ------------------------------------------------------------------ */
/* Push & Notification Handling (Native Mobile & Desktop Background) */
/* ------------------------------------------------------------------ */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "🎲 Sinal Bac Bo Live",
      body: event.data ? event.data.text() : "Nova oportunidade identificada na mesa!",
    };
  }

  const title = data.title || "🎲 Sinal Bac Bo Live";
  const options = {
    body: data.body || "Nova oportunidade na mesa. Abra o aplicativo para apostar!",
    icon: data.icon || "/icon-192.png",
    badge: "/favicon.png",
    vibrate: [200, 100, 200, 100, 300],
    tag: data.tag || "bacbo-signal",
    renotify: true,
    data: {
      url: data.url || "/robos",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/robos";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/robos") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});

/* ------------------------------------------------------------------ */
/* Network Caching Strategy                                           */
/* ------------------------------------------------------------------ */

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (
    url.pathname.startsWith("/api") ||
    url.hostname.includes("supabase") ||
    url.hostname.includes("lynxmetrics")
  ) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match("/"));
      }),
    );
    return;
  }

  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?|css|js)$/) ||
    url.origin === self.location.origin
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      }),
    );
  }
});
