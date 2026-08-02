/** Registers the local app shell only in contexts where service workers are valid. */
export async function registerPwa() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;

  const register = async () => {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    window.addEventListener('online', () => registration.update(), { passive: true });
    return registration;
  };

  if (document.readyState === 'complete') return register();

  return new Promise((resolve, reject) => {
    window.addEventListener('load', () => register().then(resolve, reject), { once: true });
  });
}
