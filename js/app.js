/* ===========================================
   App Entry Point — ES Module
   Initializes GameManager + PWA registration
   =========================================== */

import GameManager from './GameManager.js';

// ==========================================
// GESTURE PREVENTION (iOS/Mobile)
// ==========================================

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

// Prevent scroll bounce
let lastTouchY = 0;
document.addEventListener('touchstart', (e) => {
  lastTouchY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (e.target === document.body || e.target === document.documentElement) {
    e.preventDefault();
  }
}, { passive: false });

// Hide address bar on mobile
window.scrollTo(0, 1);

// ==========================================
// BACKGROUND IMAGE FALLBACK
// ==========================================

const bgElement = document.getElementById('balls-bg');
if (bgElement) {
  const testImg = new Image();
  testImg.src = 'https://i.imgur.com/NTpUOB0.jpeg';
  testImg.onerror = () => bgElement.dataset.failed = 'true';
}

// ==========================================
// INITIALIZE GAME MANAGER
// ==========================================

const gameManager = new GameManager();

// ==========================================
// PWA SERVICE WORKER REGISTRATION
// ==========================================

if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('✅ PWA Service Worker registrado:', registration.scope);
    } catch (err) {
      console.warn('⚠️ Falha ao registrar Service Worker:', err);
    }
  });
}

// ==========================================
// EXPORT FOR DEBUGGING (dev only)
// ==========================================

if (import.meta.url) {
  globalThis.__gameManager = gameManager;
}
