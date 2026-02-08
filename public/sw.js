/**
 * Service Worker — Espetinhos 1000K PWA
 * Estrategia: Cache-first para assets, Network-first para paginas/API.
 * Compativel com Android 5+ e iOS 11.3+
 */

const CACHE_NAME = 'espetinhos-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Instalacao — pre-cache dos assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Ativa imediatamente sem esperar tabs fecharem
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
  // Toma controle de todas as tabs abertas
  self.clients.claim()
})

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requests que nao sao GET
  if (request.method !== 'GET') return

  // Ignorar requests para Supabase (API externa)
  if (url.hostname.includes('supabase')) return

  // Ignorar chrome-extension e outros protocolos
  if (!url.protocol.startsWith('http')) return

  // Assets estaticos (_next/static, icons, fonts) — Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          // Salva no cache para proxima vez
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Paginas HTML — Network-first com fallback para cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Salva pagina no cache
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          // Offline — tenta servir do cache
          return caches.match(request).then((cached) => {
            if (cached) return cached
            // Fallback: pagina inicial
            return caches.match('/')
          })
        })
    )
    return
  }
})
