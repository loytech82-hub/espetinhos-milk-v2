/**
 * Service Worker — Espetinhos 1000K PWA
 * Estrategia: Network-first para tudo, cache so como fallback offline.
 * Compativel com Android 5+ e iOS 11.3+
 */

const CACHE_NAME = 'espetinhos-v2'

// Instalacao — ativa imediatamente
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Ativacao — limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requests que nao sao GET
  if (request.method !== 'GET') return

  // Ignorar Supabase e APIs externas
  if (url.hostname.includes('supabase')) return

  // Ignorar chrome-extension e outros protocolos
  if (!url.protocol.startsWith('http')) return

  // Ignorar API routes do Next.js
  if (url.pathname.startsWith('/api/')) return

  // Network-first para tudo — cache so como fallback offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Salvar no cache para uso offline
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline — servir do cache
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // Fallback para pagina inicial
          return caches.match('/')
        })
      })
  )
})
