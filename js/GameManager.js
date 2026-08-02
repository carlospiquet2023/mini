import ThemeManager from './ThemeManager.js';
import InputController from './InputController.js';
import ViewportManager from './ViewportManager.js';
import BallGame from './BallGame.js';
import SnakeGame from './SnakeGame.js';
import SpaceGame from './SpaceGame.js';
import PacmanGame from './PacmanGame.js';
import TetrisGame from './TetrisGame.js';
import RunnerGame from './RunnerGame.js';
import MermaidGame from './MermaidGame.js';

const GAME_DEFINITIONS = {
  balls: {
    Game: BallGame,
    name: 'Jogo das Bolinhas',
    theme: 'default',
    status: () => ['GOAL', String(BallGame.NUM_BALLS)]
  },
  worm: {
    Game: SnakeGame,
    name: 'Minhoca Voraz',
    theme: 'worm',
    status: (_game, score) => ['LEVEL', String(Math.floor(score / 5) + 1)]
  },
  space: {
    Game: SpaceGame,
    name: 'Nave na Galáxia',
    theme: 'space',
    status: (game) => ['LIFE', String(game.lives ?? 3)]
  },
  pacman: {
    Game: PacmanGame,
    name: 'Pac-Man Retro',
    theme: 'pacman',
    status: (game) => ['LEVEL', String(game.level ?? 1)]
  },
  tetris: {
    Game: TetrisGame,
    name: 'Tetris Classic',
    theme: 'tetris',
    status: (game) => ['LEVEL', String(game.level ?? 1)]
  },
  runner: {
    Game: RunnerGame,
    name: 'Super Pulo',
    theme: 'runner',
    status: (_game, score) => ['DIST', String(Math.floor(score))]
  },
  mermaid: {
    Game: MermaidGame,
    name: 'Sereia & Borboleta',
    theme: 'mermaid',
    status: (game) => ['FASE', String(game.level ?? 1)]
  }
};

export default class GameManager {
  #dom;
  #games = new Map();
  #scores = new Map();
  #activeGameId = 'balls';
  #viewportSize = { width: 0, height: 0 };
  #abortController = new AbortController();
  #themeManager;
  #inputController;
  #viewportManager;
  #modalOpen = false;
  #lastFocusedElement = null;

  constructor() {
    this.#dom = this.#cacheDom();
    this.#themeManager = new ThemeManager(this.#dom.screenFlash);
    this.#createGames();
    this.#bindInterface();

    this.#inputController = new InputController({
      onDirection: (direction, pressed) => this.#handleDirection(direction, pressed),
      onButton: (button, pressed) => this.#handleButton(button, pressed),
      onReset: () => this.#restartActiveGame(),
      onEscape: () => this.#handleEscape()
    });

    this.#viewportManager = new ViewportManager(
      this.#dom.screenBezel,
      (width, height) => this.resize(width, height)
    );

    this.resize(this.#dom.screenBezel.clientWidth, this.#dom.screenBezel.clientHeight);
    this.#renderActiveLayer();
    this.#syncScoreboard();
    this.#games.get('balls').start();
  }

  get activeGame() {
    return this.#activeGameId;
  }

  #cacheDom() {
    const required = (selector) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Elemento obrigatório não encontrado: ${selector}`);
      return element;
    };

    return {
      ballsLayer: required('#balls-layer'),
      miniLayer: required('#mini-layer'),
      screenBezel: required('.screen-bezel'),
      ballCanvas: required('#game-canvas'),
      miniCanvas: required('#mini-canvas'),
      score: required('#score'),
      scoreBox: required('#score-box'),
      statusLabel: required('#status-lbl'),
      statusValue: required('#status-val'),
      winMessage: required('#win-message'),
      resetWin: required('#reset-button'),
      resetGame: required('#reset-game'),
      back: required('#back-btn'),
      openGames: required('#open-games-menu'),
      closeGames: required('#close-games-modal'),
      gamesModal: required('#games-modal'),
      gamesGrid: required('.games-grid-menu'),
      screenFlash: required('#screen-flash')
    };
  }

  #createGames() {
    const miniContext = this.#dom.miniCanvas.getContext('2d', { alpha: false });
    const ballContext = this.#dom.ballCanvas.getContext('2d');
    if (!miniContext || !ballContext) throw new Error('Canvas 2D indisponível neste navegador.');

    for (const [id, definition] of Object.entries(GAME_DEFINITIONS)) {
      const canvas = id === 'balls' ? this.#dom.ballCanvas : this.#dom.miniCanvas;
      const context = id === 'balls' ? ballContext : miniContext;
      const callbacks = {
        onScoreChange: (score) => this.#handleScoreChange(id, score),
        onStateChange: () => this.#syncScoreboardFor(id),
        onGameOver: () => this.#syncScoreboardFor(id),
        onWin: () => this.#dom.winMessage.classList.add('visible'),
        onWinHide: () => this.#dom.winMessage.classList.remove('visible')
      };

      this.#scores.set(id, 0);
      this.#games.set(id, new definition.Game(canvas, context, callbacks));
    }
  }

  #bindInterface() {
    const { signal } = this.#abortController;

    this.#dom.openGames.addEventListener('click', () => this.#openGamesModal(), { signal });
    this.#dom.closeGames.addEventListener('click', () => this.#closeGamesModal(), { signal });
    this.#dom.gamesModal.addEventListener('click', (event) => {
      if (event.target === this.#dom.gamesModal) this.#closeGamesModal();
    }, { signal });

    this.#dom.gamesGrid.addEventListener('click', (event) => {
      const gameButton = event.target.closest('[data-game]');
      if (!gameButton) return;
      this.#closeGamesModal();
      this.#switchGame(gameButton.dataset.game);
    }, { signal });

    this.#dom.back.addEventListener('click', () => this.#switchGame('balls'), { signal });
    this.#dom.resetWin.addEventListener('click', () => this.#restartActiveGame(), { signal });
    this.#dom.resetGame.addEventListener('click', () => this.#restartActiveGame(), { signal });
  }

  #openGamesModal() {
    if (this.#modalOpen) return;
    this.#inputController?.releaseAll();
    this.#lastFocusedElement = document.activeElement;
    this.#modalOpen = true;
    this.#dom.gamesModal.classList.add('open');
    this.#dom.gamesModal.setAttribute('aria-hidden', 'false');
    this.#dom.openGames.setAttribute('aria-expanded', 'true');
    this.#dom.closeGames.focus({ preventScroll: true });
  }

  #closeGamesModal(restoreFocus = true) {
    if (!this.#modalOpen) return;
    this.#modalOpen = false;
    this.#dom.gamesModal.classList.remove('open');
    this.#dom.gamesModal.setAttribute('aria-hidden', 'true');
    this.#dom.openGames.setAttribute('aria-expanded', 'false');

    if (restoreFocus && this.#lastFocusedElement instanceof HTMLElement) {
      this.#lastFocusedElement.focus({ preventScroll: true });
    }
    this.#lastFocusedElement = null;
  }

  #handleEscape() {
    if (this.#modalOpen) this.#closeGamesModal();
    else if (this.#activeGameId !== 'balls') this.#switchGame('balls');
  }

  #handleScoreChange(gameId, score) {
    this.#scores.set(gameId, Number.isFinite(score) ? score : 0);
    if (gameId !== this.#activeGameId) return;

    this.#syncScoreboard();
    this.#dom.scoreBox.classList.remove('score-pop');
    void this.#dom.scoreBox.offsetWidth;
    this.#dom.scoreBox.classList.add('score-pop');
  }

  #syncScoreboardFor(gameId) {
    if (gameId === this.#activeGameId) this.#syncScoreboard();
  }

  #syncScoreboard() {
    const game = this.#games.get(this.#activeGameId);
    const definition = GAME_DEFINITIONS[this.#activeGameId];
    const score = this.#scores.get(this.#activeGameId) ?? game?.score ?? 0;
    const [label, value] = definition.status(game, score);

    this.#dom.score.textContent = String(Math.floor(score));
    this.#dom.statusLabel.textContent = label;
    this.#dom.statusValue.textContent = value;
  }

  #handleDirection(direction, pressed) {
    if (this.#modalOpen) return;
    const game = this.#games.get(this.#activeGameId);
    if (!game) return;

    if (this.#activeGameId === 'balls') {
      if (direction === 'left') pressed ? game.onButtonADown() : game.onButtonAUp();
      if (direction === 'right') pressed ? game.onButtonBDown() : game.onButtonBUp();
      if (direction === 'up') {
        pressed ? (game.onButtonADown(), game.onButtonBDown()) : (game.onButtonAUp(), game.onButtonBUp());
      }
      return;
    }

    game.onDirection?.(direction, pressed);
  }

  #handleButton(button, pressed) {
    if (this.#modalOpen) return;
    const game = this.#games.get(this.#activeGameId);
    if (!game) return;

    if (button === 'A') pressed ? game.onButtonADown?.() : game.onButtonAUp?.();
    else pressed ? game.onButtonBDown?.() : game.onButtonBUp?.();
  }

  #restartActiveGame() {
    this.#inputController?.releaseAll();
    const game = this.#games.get(this.#activeGameId);
    game?.restart?.();
    this.#syncScoreboard();
  }

  #switchGame(targetId) {
    if (!GAME_DEFINITIONS[targetId] || targetId === this.#activeGameId) return;

    this.#inputController.releaseAll();
    this.#games.get(this.#activeGameId)?.stop?.();
    this.#activeGameId = targetId;
    this.#themeManager.setTheme(GAME_DEFINITIONS[targetId].theme);
    this.#renderActiveLayer();
    this.#resizeActiveGames();
    this.#syncScoreboard();
    this.#games.get(targetId)?.start?.();
  }

  #renderActiveLayer() {
    const isBallGame = this.#activeGameId === 'balls';
    this.#dom.ballsLayer.hidden = !isBallGame;
    this.#dom.miniLayer.classList.toggle('visible', !isBallGame);
    this.#dom.miniCanvas.setAttribute('aria-label', GAME_DEFINITIONS[this.#activeGameId].name);
    document.body.dataset.game = this.#activeGameId;
    if (isBallGame) this.#dom.winMessage.classList.remove('visible');
  }

  resize(width, height) {
    if (width < 2 || height < 2) return;
    this.#viewportSize = { width, height };
    this.#resizeActiveGames();
  }

  #resizeActiveGames() {
    const { width, height } = this.#viewportSize;
    if (width < 2 || height < 2) return;

    this.#games.get('balls')?.resize?.(width, height);
    if (this.#activeGameId !== 'balls') {
      this.#games.get(this.#activeGameId)?.resize?.(width, height);
    }
  }

  destroy() {
    this.#abortController.abort();
    this.#inputController?.destroy();
    this.#viewportManager?.destroy();
    for (const game of this.#games.values()) game.stop?.();
  }
}
