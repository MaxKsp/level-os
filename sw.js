// Service worker do Level OS.
//
// CONTRATO: a PWA é instalável e online-first. O worker cacheia SOMENTE assets
// públicos e versionados. Nunca cacheia página PHP, navegação, resposta de API
// nem qualquer conteúdo autenticado — dados pessoais não ficam em disco por
// conta do cache.
//
// Estratégias:
//   /frontend-assets/  -> cache-first (nome com hash, conteúdo imutável)
//   /assets/           -> network-first (nome estável, pode mudar entre deploys)
const CACHE = 'level-os-static-v4';
const PRECACHE = [
  '/assets/auth.css',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/level-os-icon.svg',
];

const IMMUTABLE_PREFIX = '/frontend-assets/';
const REVALIDATED_PREFIX = '/assets/';

async function precache() {
  const cache = await caches.open(CACHE);
  // Um item ausente não pode abortar a instalação inteira: sem isso o worker
  // nunca ativa e a PWA deixa de existir por causa de um único arquivo.
  await Promise.all(PRECACHE.map((asset) => cache.add(asset).catch(() => undefined)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const copy = response.clone();
    void caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Navegação e documento continuam sempre na rede: o shell é autenticado.
  if (request.mode === 'navigate' || request.destination === 'document') return;
  if (url.search) return; // requisição parametrizada nunca é asset estático

  if (url.pathname.startsWith(IMMUTABLE_PREFIX)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith(REVALIDATED_PREFIX)) {
    event.respondWith(networkFirst(request));
  }
});
