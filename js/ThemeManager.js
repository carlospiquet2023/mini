const THEME_COLORS = {
  default: '#3b82f6',
  worm: '#2d5016',
  space: '#312e81',
  pacman: '#854d0e',
  tetris: '#0e7490',
  runner: '#0369a1',
  mermaid: '#6b21a8'
};

/** Applies visual themes synchronously so game switching cannot race. */
export default class ThemeManager {
  #currentTheme = 'default';
  #body = document.body;
  #flashElement;
  #themeMeta = document.querySelector('meta[name="theme-color"]');

  constructor(flashElement) {
    this.#flashElement = flashElement;
  }

  get current() {
    return this.#currentTheme;
  }

  setTheme(themeName) {
    if (!THEME_COLORS[themeName] || themeName === this.#currentTheme) return;

    this.#currentTheme = themeName;
    this.#body.dataset.theme = themeName;
    if (this.#themeMeta) this.#themeMeta.content = THEME_COLORS[themeName];

    this.#flashElement.classList.remove('active');
    void this.#flashElement.offsetWidth;
    this.#flashElement.classList.add('active');
  }
}
