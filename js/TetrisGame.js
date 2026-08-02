import { configureCanvas } from './utils/canvas.js';

export default class TetrisGame {
  constructor(canvas, ctx, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.callbacks = {
      onScoreChange: callbacks.onScoreChange || (() => {}),
      onGameOver: callbacks.onGameOver || (() => {})
    };

    this.cols = 10;
    this.rows = 16;
    
    // Tetromino definitions
    this.tetrominoes = {
      I: { color: '#06b6d4', shapes: [
        [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
        [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
        [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
      ] },
      J: { color: '#3b82f6', shapes: [
        [[1,0,0],[1,1,1],[0,0,0]],
        [[0,1,1],[0,1,0],[0,1,0]],
        [[0,0,0],[1,1,1],[0,0,1]],
        [[0,1,0],[0,1,0],[1,1,0]]
      ] },
      L: { color: '#f97316', shapes: [
        [[0,0,1],[1,1,1],[0,0,0]],
        [[0,1,0],[0,1,0],[0,1,1]],
        [[0,0,0],[1,1,1],[1,0,0]],
        [[1,1,0],[0,1,0],[0,1,0]]
      ] },
      O: { color: '#facc15', shapes: [
        [[1,1],[1,1]],
        [[1,1],[1,1]],
        [[1,1],[1,1]],
        [[1,1],[1,1]]
      ] },
      S: { color: '#22c55e', shapes: [
        [[0,1,1],[1,1,0],[0,0,0]],
        [[0,1,0],[0,1,1],[0,0,1]],
        [[0,0,0],[0,1,1],[1,1,0]],
        [[1,0,0],[1,1,0],[0,1,0]]
      ] },
      T: { color: '#a855f7', shapes: [
        [[0,1,0],[1,1,1],[0,0,0]],
        [[0,1,0],[0,1,1],[0,1,0]],
        [[0,0,0],[1,1,1],[0,1,0]],
        [[0,1,0],[1,1,0],[0,1,0]]
      ] },
      Z: { color: '#ef4444', shapes: [
        [[1,1,0],[0,1,1],[0,0,0]],
        [[0,0,1],[0,1,1],[0,1,0]],
        [[0,0,0],[1,1,0],[0,1,1]],
        [[0,1,0],[1,1,0],[1,0,0]]
      ] }
    };
    this.keys = Object.keys(this.tetrominoes);

    this.isRunning = false;
    this.rafId = null;
    this.lastTime = 0;
    this.resize(canvas.width, canvas.height);
    
    this.initGame();
  }

  initGame() {
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.isGameOver = false;
    
    this.baseDropInterval = 800;
    this.dropInterval = this.baseDropInterval;
    this.dropTimer = 0;
    
    this.isBDown = false;
    this.bDownTime = 0;
    
    this.clearingLines = [];
    this.clearAnimationTime = 0;

    this.nextPieceKey = this.getRandomPieceKey();
    this.spawnPiece();
    
    this.callbacks.onScoreChange(this.score);
  }

  getRandomPieceKey() {
    return this.keys[Math.floor(Math.random() * this.keys.length)];
  }

  spawnPiece() {
    const key = this.nextPieceKey;
    this.nextPieceKey = this.getRandomPieceKey();
    
    this.currentPiece = {
      key,
      rotation: 0,
      shape: this.tetrominoes[key].shapes[0],
      color: this.tetrominoes[key].color,
      x: Math.floor(this.cols / 2) - Math.floor(this.tetrominoes[key].shapes[0][0].length / 2),
      y: 0
    };

    if (this.collides()) {
      this.isGameOver = true;
      this.callbacks.onGameOver(this.score);
    }
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame((timestamp) => this.loop(timestamp));
    }
  }

  stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  restart() {
    this.initGame();
    if (!this.isRunning) this.start();
  }

  resize(width, height) {
    const size = configureCanvas(this.canvas, this.ctx, width, height);
    this.width = size.width;
    this.height = size.height;

    const marginTop = 6;
    const padding = 6;
    const availableHeight = this.height - marginTop - padding;

    // Maximize cell size to expand board laterally and vertically
    const maxCellH = Math.floor(availableHeight / this.rows);
    const maxCellW = Math.floor((this.width - 45) / this.cols);

    this.cellSize = Math.min(maxCellH, maxCellW);
    this.boardWidth = this.cellSize * this.cols;
    this.boardHeight = this.cellSize * this.rows;

    // Center grid with minimal lateral side margins
    this.boardX = Math.floor((this.width - 40 - this.boardWidth) / 2) + 6;
    if (this.boardX < 6) this.boardX = 6;

    this.boardY = marginTop + Math.floor((availableHeight - this.boardHeight) / 2);

    this.panelX = this.boardX + this.boardWidth + 6;
    this.panelY = this.boardY + 2;
    this.panelWidth = this.width - this.panelX - 4;
  }

  collides(offsetX = 0, offsetY = 0, shape = this.currentPiece.shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        
        let newX = this.currentPiece.x + c + offsetX;
        let newY = this.currentPiece.y + r + offsetY;
        
        if (newX < 0 || newX >= this.cols || newY >= this.rows) return true;
        if (newY >= 0 && this.grid[newY][newX] !== null) return true;
      }
    }
    return false;
  }

  lockPiece() {
    for (let r = 0; r < this.currentPiece.shape.length; r++) {
      for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
        if (this.currentPiece.shape[r][c]) {
          const cy = this.currentPiece.y + r;
          const cx = this.currentPiece.x + c;
          if (cy >= 0 && cy < this.rows && cx >= 0 && cx < this.cols) {
            this.grid[cy][cx] = this.currentPiece.color;
          }
        }
      }
    }
    this.checkLines();
    if (this.clearingLines.length === 0) {
      this.spawnPiece();
    }
  }

  checkLines() {
    let linesToClear = [];
    for (let r = 0; r < this.rows; r++) {
      if (this.grid[r].every(cell => cell !== null)) {
        linesToClear.push(r);
      }
    }

    if (linesToClear.length > 0) {
      this.clearingLines = linesToClear;
      this.clearAnimationTime = 0.2;
      
      const pts = [0, 100, 300, 700, 1200];
      this.score += pts[linesToClear.length] || 100;
      this.lines += linesToClear.length;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, this.baseDropInterval - (this.level - 1) * 70);

      this.callbacks.onScoreChange(this.score);
    }
  }

  update(dt) {
    if (this.isGameOver) return;

    if (this.clearingLines.length > 0) {
      this.clearAnimationTime -= dt;
      if (this.clearAnimationTime <= 0) {
        for (let r of this.clearingLines) {
          this.grid.splice(r, 1);
          this.grid.unshift(Array(this.cols).fill(null));
        }
        this.clearingLines = [];
        this.spawnPiece();
      }
      return;
    }

    if (this.isBDown) {
      this.bDownTime += dt;
      if (this.bDownTime > 0.2) {
        this.dropTimer += dt * 4;
      }
    } else {
      this.bDownTime = 0;
    }

    this.dropTimer += dt * 1000;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      if (!this.collides(0, 1)) {
        this.currentPiece.y++;
      } else {
        this.lockPiece();
      }
    }
  }

  onDirection(dir, pressed) {
    if (this.isGameOver || !this.currentPiece) {
      if (pressed) this.initGame();
      return;
    }
    if (dir === 'up' && pressed) {
      this.onButtonADown();
    } else if (dir === 'down') {
      this.isBDown = pressed;
      this.bDownTime = 0;
    } else if (dir === 'left' && pressed) {
      if (!this.collides(-1, 0)) this.currentPiece.x--;
    } else if (dir === 'right' && pressed) {
      if (!this.collides(1, 0)) this.currentPiece.x++;
    }
  }

  rotatePiece() {
    if (this.isGameOver || !this.currentPiece) {
      this.initGame();
      return;
    }
    const shapes = this.tetrominoes[this.currentPiece.key].shapes;
    const nextRot = (this.currentPiece.rotation + 1) % shapes.length;
    const nextShape = shapes[nextRot];

    if (!this.collides(0, 0, nextShape)) {
      this.currentPiece.rotation = nextRot;
      this.currentPiece.shape = nextShape;
    } else if (!this.collides(-1, 0, nextShape)) {
      this.currentPiece.x--;
      this.currentPiece.rotation = nextRot;
      this.currentPiece.shape = nextShape;
    } else if (!this.collides(1, 0, nextShape)) {
      this.currentPiece.x++;
      this.currentPiece.rotation = nextRot;
      this.currentPiece.shape = nextShape;
    }
  }

  onButtonADown() {
    this.rotatePiece();
  }

  onButtonAUp() {}

  onButtonBDown() {
    this.rotatePiece();
  }

  onButtonBUp() {}

  getGhostY() {
    let gy = this.currentPiece.y;
    while (!this.collides(0, gy - this.currentPiece.y + 1)) {
      gy++;
    }
    return gy;
  }

  drawBlock(x, y, color, size, isGhost = false) {
    if (isGhost) {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
      return;
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, size, size);

    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.fillRect(x, y, size, 2);
    this.ctx.fillRect(x, y, 2, size);

    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.fillRect(x, y + size - 2, size, 2);
    this.ctx.fillRect(x + size - 2, y, 2, size);
  }

  loop(timestamp) {
    if (!this.isRunning) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.rafId = requestAnimationFrame((time) => this.loop(time));
  }

  draw() {
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Board background & grid
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(this.boardX, this.boardY, this.boardWidth, this.boardHeight);

    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 0.5;
    for (let r = 0; r <= this.rows; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.boardX, this.boardY + r * this.cellSize);
      this.ctx.lineTo(this.boardX + this.boardWidth, this.boardY + r * this.cellSize);
      this.ctx.stroke();
    }
    for (let c = 0; c <= this.cols; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.boardX + c * this.cellSize, this.boardY);
      this.ctx.lineTo(this.boardX + c * this.cellSize, this.boardY + this.boardHeight);
      this.ctx.stroke();
    }

    // Locked blocks
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) {
          if (this.clearingLines.includes(r) && Math.floor(Date.now() / 50) % 2 === 0) {
            this.drawBlock(
              this.boardX + c * this.cellSize,
              this.boardY + r * this.cellSize,
              '#ffffff',
              this.cellSize
            );
          } else {
            this.drawBlock(
              this.boardX + c * this.cellSize,
              this.boardY + r * this.cellSize,
              this.grid[r][c],
              this.cellSize
            );
          }
        }
      }
    }

    // Current Piece & Ghost
    if (this.currentPiece && this.clearingLines.length === 0) {
      const gy = this.getGhostY();
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c]) {
            this.drawBlock(
              this.boardX + (this.currentPiece.x + c) * this.cellSize,
              this.boardY + (gy + r) * this.cellSize,
              this.currentPiece.color,
              this.cellSize,
              true
            );
          }
        }
      }
      
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c]) {
            this.drawBlock(
              this.boardX + (this.currentPiece.x + c) * this.cellSize,
              this.boardY + (this.currentPiece.y + r) * this.cellSize,
              this.currentPiece.color,
              this.cellSize
            );
          }
        }
      }
    }

    // UI Panel - Only Next Piece Preview on canvas (Score & Level are on the plastic LCD displays!)
    this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
    this.ctx.font = 'bold 11px system-ui, sans-serif';
    this.ctx.textBaseline = 'top';

    let ty = this.panelY;
    this.ctx.fillText(`NEXT`, this.panelX, ty);

    // Draw Next Piece
    const nextObj = this.tetrominoes[this.nextPieceKey];
    const nShape = nextObj.shapes[0];
    const nSize = Math.min(this.cellSize * 0.85, 16);

    for (let r = 0; r < nShape.length; r++) {
      for (let c = 0; c < nShape[r].length; c++) {
        if (nShape[r][c]) {
          this.drawBlock(
            this.panelX + c * nSize,
            ty + 18 + r * nSize,
            nextObj.color,
            nSize
          );
        }
      }
    }

    // Game Over Overlay
    if (this.isGameOver) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      this.ctx.fillStyle = '#ef4444';
      this.ctx.font = 'bold 26px system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 10);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '13px system-ui, sans-serif';
      this.ctx.fillText('Pressione qualquer botão', this.width / 2, this.height / 2 + 30);
      this.ctx.textAlign = 'left';
    }
  }
}
