/* ===========================================
   ThemeManager — Dynamic Theme Transitions
   Uses View Transitions API (2026) + CSS vars
   =========================================== */

export default class ThemeManager {
  #currentTheme = 'default';
  #body;
  #flashEl;

  /** @param {HTMLElement} flashEl - The screen flash overlay element */
  constructor(flashEl) {
    this.#body = document.body;
    this.#flashEl = flashEl;
  }

  get current() {
    return this.#currentTheme;
  }

  /**
   * Transition to a new theme with visual effects
   * @param {'default' | 'worm' | 'space'} themeName
   * @returns {Promise<void>}
   */
  async setTheme(themeName) {
    if (themeName === this.#currentTheme) return;

    // Try View Transitions API (2025+)
    if (document.startViewTransition) {
      await document.startViewTransition(() => {
        this.#applyTheme(themeName);
      }).finished;
    } else {
      // Fallback: manual flash animation
      await this.#flashTransition(themeName);
    }
  }

  /**
   * Apply theme with flash effect (fallback)
   * @param {string} themeName
   * @returns {Promise<void>}
   */
  #flashTransition(themeName) {
    return new Promise(resolve => {
      // Trigger flash
      this.#flashEl.classList.add('active');

      // Apply theme mid-flash
      setTimeout(() => {
        this.#applyTheme(themeName);
      }, 80);

      // Clean up after animation
      const onEnd = () => {
        this.#flashEl.classList.remove('active');
        this.#flashEl.removeEventListener('animationend', onEnd);
        resolve();
      };

      this.#flashEl.addEventListener('animationend', onEnd);

      // Safety timeout
      setTimeout(() => {
        this.#flashEl.classList.remove('active');
        resolve();
      }, 700);
    });
  }

  /**
   * Apply theme CSS variables
   * @param {string} themeName
   */
  #applyTheme(themeName) {
    this.#body.dataset.theme = themeName;
    this.#currentTheme = themeName;

    // Update meta theme-color for mobile browser
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const colors = {
        default: '#3b82f6',
        worm: '#2d5016',
        space: '#1e1b4b'
      };
      metaTheme.content = colors[themeName] ?? '#3b82f6';
    }
  }
}
