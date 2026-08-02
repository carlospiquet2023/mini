const CACHE_NAME = 'cp-games-shell-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './css/main.css',
  './css/themes.css',
  './css/animations.css',
  './vendor/matter.min.js',
  './js/app.js',
  './js/GameManager.js',
  './js/InputController.js',
  './js/PwaManager.js',
  './js/ViewportManager.js',
  './js/ThemeManager.js',
  './js/ParticleSystem.js',
  './js/BallGame.js',
  './js/SnakeGame.js',
  './js/SpaceGame.js',
  './js/PacmanGame.js',
  './js/TetrisGame.js',
  './js/RunnerGame.js',
  './js/MermaidGame.js',
  './js/utils/canvas.js',
  './assets/underwater-bg.jpeg',
  './assets/runner_hero.png',
  './assets/shroom_enemy.png',
  './assets/drone_enemy.png',
  './assets/lava_monster.png',
  './assets/alien_crab.png',
  './assets/mermaid_sprite.png',
  './assets/butterfly_sprite.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    );

    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstNavigation(event) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await event.preloadResponse || await fetch(event.request);
    if (response?.ok) await cache.put('./index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('./index.html')) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  if (cached) {
    void network.catch(() => undefined);
    return cached;
  }

  try {
    return await network;
  } catch {
    return new Response('Recurso indisponível offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
