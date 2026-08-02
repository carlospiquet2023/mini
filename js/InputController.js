const KEY_ACTIONS = new Map([
  ['ArrowUp', 'direction:up'],
  ['KeyW', 'direction:up'],
  ['ArrowDown', 'direction:down'],
  ['KeyS', 'direction:down'],
  ['ArrowLeft', 'direction:left'],
  ['KeyA', 'direction:left'],
  ['ArrowRight', 'direction:right'],
  ['KeyD', 'direction:right'],
  ['KeyZ', 'button:A'],
  ['KeyJ', 'button:A'],
  ['KeyX', 'button:B'],
  ['KeyK', 'button:B']
]);

const POINTER_ACTIONS = [
  ['#dpad-up', 'direction:up'],
  ['#dpad-down', 'direction:down'],
  ['#dpad-left', 'direction:left'],
  ['#dpad-right', 'direction:right'],
  ['#button-a', 'button:A'],
  ['#button-b', 'button:B']
];

/** Unifies keyboard, mouse, pen and touch controls without duplicate events. */
export default class InputController {
  #abortController = new AbortController();
  #activeSources = new Map();
  #pointerReleases = [];
  #onDirection;
  #onButton;
  #onReset;
  #onEscape;

  constructor({ onDirection, onButton, onReset, onEscape }) {
    this.#onDirection = onDirection;
    this.#onButton = onButton;
    this.#onReset = onReset;
    this.#onEscape = onEscape;

    this.#bindKeyboard();
    this.#bindPointers();
    this.#bindSafetyRelease();
  }

  #bindKeyboard() {
    const { signal } = this.#abortController;

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        this.#onEscape?.();
        return;
      }

      if (event.code === 'KeyR') {
        if (!event.repeat) this.#onReset?.();
        event.preventDefault();
        return;
      }

      const action = KEY_ACTIONS.get(event.code);
      if (!action) return;

      event.preventDefault();
      if (!event.repeat) this.#setAction(action, `key:${event.code}`, true);
    }, { signal });

    window.addEventListener('keyup', (event) => {
      const action = KEY_ACTIONS.get(event.code);
      if (!action) return;

      event.preventDefault();
      this.#setAction(action, `key:${event.code}`, false);
    }, { signal });
  }

  #bindPointers() {
    for (const [selector, action] of POINTER_ACTIONS) {
      const element = document.querySelector(selector);
      if (!element) continue;
      this.#bindPointerControl(element, action);
    }
  }

  #bindPointerControl(element, action) {
    const { signal } = this.#abortController;
    const pointers = new Set();

    const updateVisualState = () => {
      const pressed = pointers.size > 0;
      element.classList.toggle('is-pressed', pressed);
      element.setAttribute('aria-pressed', String(pressed));
    };

    const press = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();

      const source = `pointer:${event.pointerId}`;
      pointers.add(event.pointerId);
      this.#setAction(action, source, true);
      updateVisualState();

      if (element.setPointerCapture) {
        try { element.setPointerCapture(event.pointerId); } catch { /* capture is optional */ }
      }

      if (navigator.vibrate) navigator.vibrate(8);
    };

    const release = (event) => {
      if (!pointers.has(event.pointerId)) return;
      event.preventDefault();

      pointers.delete(event.pointerId);
      this.#setAction(action, `pointer:${event.pointerId}`, false);
      updateVisualState();
    };

    const releaseAll = () => {
      for (const pointerId of pointers) {
        this.#setAction(action, `pointer:${pointerId}`, false);
      }
      pointers.clear();
      updateVisualState();
    };

    element.addEventListener('pointerdown', press, { signal });
    element.addEventListener('pointerup', release, { signal });
    element.addEventListener('pointercancel', release, { signal });
    element.addEventListener('lostpointercapture', release, { signal });
    element.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
    this.#pointerReleases.push(releaseAll);
  }

  #bindSafetyRelease() {
    const { signal } = this.#abortController;
    window.addEventListener('blur', () => this.releaseAll(), { signal });
    window.addEventListener('pagehide', () => this.releaseAll(), { signal });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    }, { signal });
  }

  #setAction(action, source, pressed) {
    let sources = this.#activeSources.get(action);
    if (!sources) {
      sources = new Set();
      this.#activeSources.set(action, sources);
    }

    const wasPressed = sources.size > 0;
    if (pressed) sources.add(source);
    else sources.delete(source);
    const isPressed = sources.size > 0;

    if (wasPressed === isPressed) return;

    const [kind, value] = action.split(':');
    if (kind === 'direction') this.#onDirection?.(value, isPressed);
    else this.#onButton?.(value, isPressed);
  }

  releaseAll() {
    for (const release of this.#pointerReleases) release();

    for (const [action, sources] of this.#activeSources) {
      if (sources.size === 0) continue;
      sources.clear();
      const [kind, value] = action.split(':');
      if (kind === 'direction') this.#onDirection?.(value, false);
      else this.#onButton?.(value, false);
    }
  }

  destroy() {
    this.releaseAll();
    this.#abortController.abort();
  }
}
