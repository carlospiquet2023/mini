const CACHE_NAME = 'cp-games-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './css/main.css',
  './css/themes.css',
  './css/animations.css',
  './js/app.js',
  './js/GameManager.js',
  './js/ThemeManager.js',
  './js/ParticleSystem.js',
  './js/BallGame.js',
  './js/SnakeGame.js',
  './js/SpaceGame.js',
  './js/PacmanGame.js',
  './js/TetrisGame.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
      )
      .catch(() => caches.match('./index.html'))
  );
});
