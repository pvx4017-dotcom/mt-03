const CACHE = "meta-pwa-v6"
const SKIP_CACHE = new Set(["/sw.js", "/manifest.json", "/manifest.webmanifest"])

function isViteDevRequest(url) {
  return (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.includes("node_modules") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes(".vite") ||
    SKIP_CACHE.has(url.pathname)
  )
}

function offlineResponse() {
  return new Response("Offline", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}

async function cachedDocumentOrOffline() {
  const index = (await caches.match("/index.html")) || (await caches.match("/"))
  if (index) return index
  return offlineResponse()
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      for (const path of ["/", "/index.html"]) {
        try {
          await cache.add(path)
        } catch {
          /* ignore missing precache entries */
        }
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (isViteDevRequest(url)) return

  const isNavigate = event.request.mode === "navigate" || event.request.destination === "document"

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request)
        if (response && response.ok && response.type === "basic" && !isNavigate) {
          const copy = response.clone()
          const cache = await caches.open(CACHE)
          await cache.put(event.request, copy)
        }
        return response
      } catch (err) {
        if (isNavigate) {
          return cachedDocumentOrOffline()
        }
        const cached = await caches.match(event.request)
        if (cached) return cached
        // Do NOT return HTML for JS/CSS/asset requests — let it throw or return 404
        throw err
      }
    })(),
  )
})
