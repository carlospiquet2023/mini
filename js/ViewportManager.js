/** Keeps the PWA shell and game canvases synchronized with the visual viewport. */
export default class ViewportManager {
  #element;
  #onResize;
  #abortController = new AbortController();
  #resizeObserver;
  #frameId = null;
  #timers = new Set();
  #lastSize = { width: 0, height: 0 };

  constructor(element, onResize) {
    this.#element = element;
    this.#onResize = onResize;
    this.#bind();
    this.schedule();
  }

  #bind() {
    const { signal } = this.#abortController;
    const schedule = () => this.schedule();

    window.addEventListener('resize', schedule, { signal });
    window.addEventListener('orientationchange', () => {
      this.schedule();
      this.#scheduleDelayed(120);
      this.#scheduleDelayed(350);
    }, { signal });

    window.visualViewport?.addEventListener('resize', schedule, { signal });
    window.visualViewport?.addEventListener('scroll', schedule, { signal });

    if ('ResizeObserver' in window) {
      this.#resizeObserver = new ResizeObserver(schedule);
      this.#resizeObserver.observe(this.#element);
    }
  }

  #scheduleDelayed(delay) {
    const timer = window.setTimeout(() => {
      this.#timers.delete(timer);
      this.schedule();
    }, delay);
    this.#timers.add(timer);
  }

  schedule() {
    if (this.#frameId !== null) return;
    this.#frameId = requestAnimationFrame(() => {
      this.#frameId = null;
      this.#measure();
    });
  }

  #measure() {
    const viewport = window.visualViewport;
    const viewportHeight = Math.round(viewport?.height || window.innerHeight);
    const viewportWidth = Math.round(viewport?.width || window.innerWidth);

    document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`);
    document.documentElement.style.setProperty('--app-width', `${viewportWidth}px`);
    document.documentElement.dataset.orientation = viewportWidth > viewportHeight ? 'landscape' : 'portrait';

    const width = Math.max(1, Math.round(this.#element.clientWidth));
    const height = Math.max(1, Math.round(this.#element.clientHeight));

    if (width === this.#lastSize.width && height === this.#lastSize.height) return;
    this.#lastSize = { width, height };
    this.#onResize?.(width, height);
  }

  destroy() {
    this.#abortController.abort();
    this.#resizeObserver?.disconnect();
    if (this.#frameId !== null) cancelAnimationFrame(this.#frameId);
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers.clear();
  }
}
