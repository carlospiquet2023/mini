import GameManager from './GameManager.js';
import { registerPwa } from './PwaManager.js';

function showStartupError(error) {
  const message = document.createElement('div');
  message.className = 'app-error';
  message.setAttribute('role', 'alert');
  message.innerHTML = `
    <strong>Não foi possível iniciar o console.</strong>
    <span>Recarregue a página. Se o problema continuar, limpe o cache do aplicativo.</span>
  `;
  document.body.append(message);
  console.error(error);
}

try {
  if (!globalThis.Matter) throw new Error('A biblioteca de física não foi carregada.');

  const gameManager = new GameManager();
  Object.defineProperty(globalThis, '__gameManager', {
    value: gameManager,
    configurable: true
  });

  void registerPwa().catch((error) => {
    window.dispatchEvent(new CustomEvent('pwa-registration-error', { detail: error }));
  });
} catch (error) {
  showStartupError(error);
}
