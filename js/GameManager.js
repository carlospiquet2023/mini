/* ===========================================
   GameManager — Game Orchestration & Controls
   Manages game switching, control routing,
   canvas management, and lifecycle
   =========================================== */

import ThemeManager from './ThemeManager.js';
import BallGame from './BallGame.js';
import SnakeGame from './SnakeGame.js';
import SpaceGame from './SpaceGame.js';
import PacmanGame from './PacmanGame.js';
import TetrisGame from './TetrisGame.js';

export default class GameManager {
  // DOM elements
  #ballsLayer;
  #miniLayer;
  #ballCanvas;
  #miniCanvas;
  #miniCtx;
  #scoreEl;
  #winMessage;
  #resetButton;
  #resetGameBtn;
  #backBtn;
  #btnA;
  #btnB;
  #dpadUp;
  #dpadDown;
  #dpadLeft;
  #dpadRight;
  #selectWorm;
  #selectSpace;
  #selectPacman;
  #selectTetris;
  #statusLbl;
  #statusVal;

  // Managers
  #themeManager;

  // Games
  #ballGame;
  #snakeGame;
  #spaceGame;
  #pacmanGame;
  #tetrisGame;

  // State
  #activeGame = 'balls'; // 'balls' | 'worm' | 'space' | 'pacman' | 'tetris'
  #miniW = 0;
  #miniH = 0;

  // AbortController for cleanup
  #abortController;

  constructor() {
    this.#cacheDOM();
    this.#themeManager = new ThemeManager(document.getElementById('screen-flash'));
    this.#setupMiniCanvas();
    this.#createGames();
    this.#bindControls();
    this.#bindSelectors();
    this.#bindResize();

    // Start with ball game
    this.#ballGame.start();
  }

  // ==========================================
  // DOM CACHING
  // ==========================================

  #cacheDOM() {
    this.#ballsLayer = document.getElementById('balls-layer');
    this.#miniLayer = document.getElementById('mini-layer');
    this.#ballCanvas = document.getElementById('game-canvas');
    this.#miniCanvas = document.getElementById('mini-canvas');
    this.#scoreEl = document.getElementById('score');
    this.#winMessage = document.getElementById('win-message');
    this.#resetButton = document.getElementById('reset-button');
    this.#resetGameBtn = document.getElementById('reset-game');
    this.#backBtn = document.getElementById('back-btn');
    this.#btnA = document.getElementById('button-a');
    this.#btnB = document.getElementById('button-b');
    this.#dpadUp = document.getElementById('dpad-up');
    this.#dpadDown = document.getElementById('dpad-down');
    this.#dpadLeft = document.getElementById('dpad-left');
    this.#dpadRight = document.getElementById('dpad-right');
    this.#selectWorm = document.getElementById('select-worm');
    this.#selectSpace = document.getElementById('select-space');
    this.#selectPacman = document.getElementById('select-pacman');
    this.#selectTetris = document.getElementById('select-tetris');
    this.#statusLbl = document.getElementById('status-lbl');
    this.#statusVal = document.getElementById('status-val');
  }

  // ==========================================
  // MINI CANVAS SETUP
  // ==========================================

  #setupMiniCanvas() {
    const container = this.#miniCanvas.parentElement;
    const rect = container.getBoundingClientRect();
    this.#miniW = rect.width;
    this.#miniH = rect.height;
    this.#miniCtx = this.#miniCanvas.getContext('2d');
  }

  // ==========================================
  // GAME CREATION
  // ==========================================

  #createGames() {
    const ballCtx = this.#ballCanvas.getContext('2d');

    // Ball Game
    this.#ballGame = new BallGame(this.#ballCanvas, ballCtx, {
      onScoreChange: (score) => {
        this.#scoreEl.textContent = score;
        this.#statusLbl.textContent = 'GOAL';
        this.#statusVal.textContent = '12';
        this.#scoreEl.parentElement.classList.remove('score-pop');
        void this.#scoreEl.parentElement.offsetWidth;
        this.#scoreEl.parentElement.classList.add('score-pop');
      },
      onWin: () => {
        this.#winMessage.classList.add('visible');
      },
      onWinHide: () => {
        this.#winMessage.classList.remove('visible');
      }
    });

    // Snake Game
    this.#snakeGame = new SnakeGame(this.#miniCanvas, this.#miniCtx, {
      onScoreChange: (score) => {
        this.#scoreEl.textContent = score;
        this.#statusLbl.textContent = 'LEVEL';
        this.#statusVal.textContent = Math.floor(score / 5) + 1;
      },
      onGameOver: (score) => {}
    });

    // Space Game
    this.#spaceGame = new SpaceGame(this.#miniCanvas, this.#miniCtx, {
      onScoreChange: (score) => {
        this.#scoreEl.textContent = score;
        this.#statusLbl.textContent = 'LIFE';
        this.#statusVal.textContent = '3';
      },
      onGameOver: (score) => {}
    });

    // Pac-Man Game
    this.#pacmanGame = new PacmanGame(this.#miniCanvas, this.#miniCtx, {
      onScoreChange: (score) => {
        this.#scoreEl.textContent = score;
        this.#statusLbl.textContent = 'LEVEL';
        this.#statusVal.textContent = this.#pacmanGame?.level || '1';
      },
      onGameOver: (score) => {}
    });

    // Tetris Game
    this.#tetrisGame = new TetrisGame(this.#miniCanvas, this.#miniCtx, {
      onScoreChange: (score) => {
        this.#scoreEl.textContent = score;
        this.#statusLbl.textContent = 'LEVEL';
        this.#statusVal.textContent = this.#tetrisGame?.level || '1';
      },
      onGameOver: (score) => {}
    });
  }

  // ==========================================
  // CONTROL BINDING
  // ==========================================

  #bindControls() {
    this.#abortController = new AbortController();
    const signal = this.#abortController.signal;

    const bindBtn = (element, onDown, onUp) => {
      if (!element) return;
      element.addEventListener('mousedown', () => onDown(), { signal });
      element.addEventListener('mouseup', () => onUp(), { signal });
      element.addEventListener('mouseleave', () => onUp(), { signal });
      element.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false, signal });
      element.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); }, { passive: false, signal });
    };

    // D-Pad Cross controls
    bindBtn(this.#dpadUp, () => this.#handleDirection('up', true), () => this.#handleDirection('up', false));
    bindBtn(this.#dpadDown, () => this.#handleDirection('down', true), () => this.#handleDirection('down', false));
    bindBtn(this.#dpadLeft, () => this.#handleDirection('left', true), () => this.#handleDirection('left', false));
    bindBtn(this.#dpadRight, () => this.#handleDirection('right', true), () => this.#handleDirection('right', false));

    // ROTATE / Action Buttons (A & B)
    bindBtn(this.#btnA, () => this.#handleButton('A', true), () => this.#handleButton('A', false));
    bindBtn(this.#btnB, () => this.#handleButton('B', true), () => this.#handleButton('B', false));

    // Keyboard controls (Arrow keys / WASD / Space / Enter / Z / X)
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.#handleDirection('up', true);
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.#handleDirection('down', true);
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.#handleDirection('left', true);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.#handleDirection('right', true);
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') this.#handleButton('A', true);
    }, { signal });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.#handleDirection('up', false);
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.#handleDirection('down', false);
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.#handleDirection('left', false);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.#handleDirection('right', false);
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') this.#handleButton('A', false);
    }, { signal });

    // Reset buttons (ball game)
    this.#resetButton.addEventListener('click', () => {
      this.#winMessage.classList.remove('visible');
      this.#ballGame.restart();
    }, { signal });

    this.#resetGameBtn.addEventListener('click', () => {
      this.#winMessage.classList.remove('visible');
      if (this.#activeGame === 'balls') {
        this.#ballGame.restart();
      } else if (this.#activeGame === 'worm') {
        this.#snakeGame.restart?.();
      } else if (this.#activeGame === 'space') {
        this.#spaceGame.restart?.();
      } else if (this.#activeGame === 'pacman') {
        this.#pacmanGame.restart?.();
      } else if (this.#activeGame === 'tetris') {
        this.#tetrisGame.restart?.();
      }
    }, { signal });

    // Haptic feedback
    const haptic = () => {
      if ('vibrate' in navigator) navigator.vibrate(10);
    };
    this.#btnA?.addEventListener('touchstart', haptic, { signal });
    this.#dpadUp?.addEventListener('touchstart', haptic, { signal });
  }

  // ==========================================
  // GAME SELECTOR BINDING
  // ==========================================

  #bindSelectors() {
    const signal = this.#abortController.signal;

    this.#selectWorm.addEventListener('click', () => this.#switchGame('worm'), { signal });
    this.#selectSpace.addEventListener('click', () => this.#switchGame('space'), { signal });
    this.#selectPacman.addEventListener('click', () => this.#switchGame('pacman'), { signal });
    this.#selectTetris.addEventListener('click', () => this.#switchGame('tetris'), { signal });

    // Back button
    this.#backBtn.addEventListener('click', () => this.#switchGame('balls'), { signal });
  }

  // ==========================================
  // RESIZE HANDLING
  // ==========================================

  #bindResize() {
    const signal = this.#abortController.signal;

    window.addEventListener('resize', () => {
      this.#setupMiniCanvas();

      if (this.#activeGame === 'worm') {
        this.#snakeGame.resize(this.#miniW, this.#miniH);
      } else if (this.#activeGame === 'space') {
        this.#spaceGame.resize(this.#miniW, this.#miniH);
      } else if (this.#activeGame === 'pacman') {
        this.#pacmanGame.resize(this.#miniW, this.#miniH);
      } else if (this.#activeGame === 'tetris') {
        this.#tetrisGame.resize(this.#miniW, this.#miniH);
      }
    }, { signal });
  }

  // ==========================================
  // DIRECTION & BUTTON ROUTING
  // ==========================================

  #handleDirection(dir, pressed) {
    const game = this.#getActiveGameInstance();
    if (!game) return;

    if (this.#activeGame === 'balls') {
      if (dir === 'left') pressed ? game.onButtonADown() : game.onButtonAUp();
      if (dir === 'right') pressed ? game.onButtonBDown() : game.onButtonBUp();
      if (dir === 'up') {
        pressed ? (game.onButtonADown(), game.onButtonBDown()) : (game.onButtonAUp(), game.onButtonBUp());
      }
    } else if (game.onDirection) {
      game.onDirection(dir, pressed);
    } else {
      if (dir === 'up' && pressed) game.onUp ? game.onUp() : game.onButtonADown?.();
      if (dir === 'down' && pressed) game.onDown ? game.onDown() : null;
      if (dir === 'left' && pressed) game.onLeft ? game.onLeft() : game.onButtonADown?.();
      if (dir === 'right' && pressed) game.onRight ? game.onRight() : game.onButtonBDown?.();
    }
  }

  #handleButton(button, pressed) {
    const game = this.#getActiveGameInstance();
    if (!game) return;

    if (button === 'A') {
      pressed ? game.onButtonADown() : game.onButtonAUp();
    } else {
      pressed ? game.onButtonBDown() : game.onButtonBUp();
    }
  }

  #getActiveGameInstance() {
    switch (this.#activeGame) {
      case 'balls': return this.#ballGame;
      case 'worm': return this.#snakeGame;
      case 'space': return this.#spaceGame;
      case 'pacman': return this.#pacmanGame;
      case 'tetris': return this.#tetrisGame;
      default: return null;
    }
  }

  // ==========================================
  // GAME SWITCHING
  // ==========================================

  async #switchGame(target) {
    if (target === this.#activeGame) return;

    // Stop current game
    this.#getActiveGameInstance()?.stop();

    // Theme transition
    const themeMap = { balls: 'default', worm: 'worm', space: 'space', pacman: 'pacman', tetris: 'tetris' };
    await this.#themeManager.setTheme(themeMap[target]);

    // Toggle layers
    if (target === 'balls') {
      this.#miniLayer.classList.remove('visible');
      this.#ballsLayer.style.display = '';
      this.#winMessage.classList.remove('visible');
      this.#activeGame = 'balls';
      this.#statusLbl.textContent = 'GOAL';
      this.#statusVal.textContent = '12';
      this.#ballGame.start();
    } else {
      this.#ballsLayer.style.display = 'none';
      this.#miniLayer.classList.add('visible');
      this.#activeGame = target;

      // Re-setup canvas (might have changed size)
      this.#setupMiniCanvas();

      if (target === 'worm') {
        this.#statusLbl.textContent = 'LEVEL';
        this.#statusVal.textContent = '1';
        this.#scoreEl.textContent = this.#snakeGame?.score || 0;
        this.#snakeGame.resize(this.#miniW, this.#miniH);
        this.#snakeGame.start();
      } else if (target === 'space') {
        this.#statusLbl.textContent = 'LIFE';
        this.#statusVal.textContent = '3';
        this.#scoreEl.textContent = this.#spaceGame?.score || 0;
        this.#spaceGame.resize(this.#miniW, this.#miniH);
        this.#spaceGame.start();
      } else if (target === 'pacman') {
        this.#statusLbl.textContent = 'LEVEL';
        this.#statusVal.textContent = this.#pacmanGame?.level || 1;
        this.#scoreEl.textContent = this.#pacmanGame?.score || 0;
        this.#pacmanGame.resize(this.#miniW, this.#miniH);
        this.#pacmanGame.start();
      } else if (target === 'tetris') {
        this.#statusLbl.textContent = 'LEVEL';
        this.#statusVal.textContent = this.#tetrisGame?.level || 1;
        this.#scoreEl.textContent = this.#tetrisGame?.score || 0;
        this.#tetrisGame.resize(this.#miniW, this.#miniH);
        this.#tetrisGame.start();
      }
    }
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  destroy() {
    this.#abortController?.abort();
    this.#ballGame?.stop();
    this.#snakeGame?.stop();
    this.#spaceGame?.stop();
    this.#pacmanGame?.stop();
    this.#tetrisGame?.stop();
  }
}
