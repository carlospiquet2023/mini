export default class PacmanGame {
  constructor(canvas, ctx, callbacks) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.width = canvas.width;
    this.height = canvas.height;
    
    this.running = false;
    this.lastTime = 0;
    
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.winLevel = false;

    // Maze dimensions
    this.cols = 15;
    this.rows = 19;
    
    // UI area offset
    this.headerHeight = 40;
    this.footerHeight = 40;

    // Cell size calculation
    this.cellSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    this.originalMaze = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,0,0,0,0,0,1,0,0,0,0,0,2,1],
      [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
      [1,0,1,1,1,1,1,3,1,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,3,0,0,0,0,0,0,1],
      [1,1,1,1,0,1,1,1,1,1,0,1,1,1,1],
      [3,3,3,1,0,1,3,3,3,1,0,1,3,3,3],
      [1,1,1,1,0,1,3,1,3,1,0,1,1,1,1],
      [3,3,3,3,0,3,3,1,3,3,0,3,3,3,3],
      [1,1,1,1,0,1,1,1,1,1,0,1,1,1,1],
      [3,3,3,1,0,1,3,3,3,1,0,1,3,3,3],
      [1,1,1,1,0,1,1,1,1,1,0,1,1,1,1],
      [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
      [1,2,0,1,0,1,0,0,0,1,0,1,0,2,1],
      [1,1,0,1,0,1,1,1,1,1,0,1,0,1,1],
      [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    this.maze = [];
    this.pelletsCount = 0;

    // Entity positions in grid coordinates
    this.pacman = { x: 7, y: 13, dx: -1, dy: 0, nextDx: -1, nextDy: 0, speed: 4, pixelX: 0, pixelY: 0 };
    
    // Ghost start pos (inside ghost house or above)
    this.ghosts = [];
    
    // Animation
    this.time = 0;
    
    // Directions (Clockwise)
    this.dirs = [
      { dx: 0, dy: -1 }, // Up
      { dx: 1, dy: 0 },  // Right
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }  // Left
    ];

    this.frightenedTimer = 0;
    this.ghostEatStreak = 0;
    
    this.resize(this.width, this.height);
    this.initLevel();
  }

  initLevel() {
    this.maze = this.originalMaze.map(row => [...row]);
    this.pelletsCount = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.maze[r][c] === 0 || this.maze[r][c] === 2) {
          this.pelletsCount++;
        }
      }
    }
    
    this.resetPositions();
  }

  resetPositions() {
    this.pacman = { x: 7, y: 13, dx: -1, dy: 0, nextDx: -1, nextDy: 0, speed: 4, pixelX: 7, pixelY: 13, t: 0, dirIndex: 3 };
    
    const ghostBaseSpeed = 4 * 0.7 + (this.level * 0.1);
    
    this.ghosts = [
      { id: 'Blinky', x: 7, y: 7, dx: 1, dy: 0, pixelX: 7, pixelY: 7, speed: ghostBaseSpeed, color: '#ef4444', mode: 'chase', t: 0, dirIndex: 1 },
      { id: 'Pinky', x: 7, y: 9, dx: -1, dy: 0, pixelX: 7, pixelY: 9, speed: ghostBaseSpeed, color: '#ec4899', mode: 'scatter', t: 0, dirIndex: 3 },
      { id: 'Inky', x: 6, y: 9, dx: 1, dy: 0, pixelX: 6, pixelY: 9, speed: ghostBaseSpeed, color: '#06b6d4', mode: 'scatter', t: 0, dirIndex: 1 },
      { id: 'Clyde', x: 8, y: 9, dx: -1, dy: 0, pixelX: 8, pixelY: 9, speed: ghostBaseSpeed, color: '#f97316', mode: 'scatter', t: 0, dirIndex: 3 },
    ];
    
    this.frightenedTimer = 0;
    this.ghostEatStreak = 0;
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  stop() {
    this.running = false;
  }

  resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.width = width;
    this.height = height;

    this.headerHeight = 10;
    this.footerHeight = 22;

    const availableWidth = this.width - 10;
    const availableHeight = this.height - this.headerHeight - this.footerHeight;

    const cellW = availableWidth / this.cols;
    const cellH = availableHeight / this.rows;
    this.cellSize = Math.floor(Math.min(cellW, cellH));

    this.offsetX = Math.floor((this.width - this.cellSize * this.cols) / 2);
    this.offsetY = Math.floor(this.headerHeight + (availableHeight - this.cellSize * this.rows) / 2);
  }

  onDirection(dir, pressed) {
    if (!pressed) return;
    if (this.gameOver || this.winLevel) {
      this.restart();
      return;
    }
    if (dir === 'up') { this.pacman.nextDx = 0; this.pacman.nextDy = -1; }
    else if (dir === 'down') { this.pacman.nextDx = 0; this.pacman.nextDy = 1; }
    else if (dir === 'left') { this.pacman.nextDx = -1; this.pacman.nextDy = 0; }
    else if (dir === 'right') { this.pacman.nextDx = 1; this.pacman.nextDy = 0; }
  }

  onButtonADown() {
    if (this.gameOver || this.winLevel) {
      this.restart();
      return;
    }
    // Turn Counter-Clockwise
    this.pacman.dirIndex = (this.pacman.dirIndex + 3) % 4;
    this.pacman.nextDx = this.dirs[this.pacman.dirIndex].dx;
    this.pacman.nextDy = this.dirs[this.pacman.dirIndex].dy;
  }

  onButtonAUp() {}

  onButtonBDown() {
    if (this.gameOver || this.winLevel) {
      this.restart();
      return;
    }
    // Turn Clockwise
    this.pacman.dirIndex = (this.pacman.dirIndex + 1) % 4;
    this.pacman.nextDx = this.dirs[this.pacman.dirIndex].dx;
    this.pacman.nextDy = this.dirs[this.pacman.dirIndex].dy;
  }

  onButtonBUp() {}

  restart() {
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.winLevel = false;
    if (this.callbacks.onScoreChange) this.callbacks.onScoreChange(this.score);
    this.initLevel();
    if (!this.running) this.start();
  }

  loop(timestamp) {
    if (!this.running) return;
    
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.time += dt;

    if (!this.gameOver && !this.winLevel) {
      this.update(dt);
    }
    
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
  
  isValidMove(x, y, dx, dy) {
    let nx = x + dx;
    let ny = y + dy;
    
    // Tunnel wrap around
    if (nx < 0) nx = this.cols - 1;
    if (nx >= this.cols) nx = 0;
    
    if (ny < 0 || ny >= this.rows) return false;
    return this.maze[ny][nx] !== 1; // 1 is wall
  }

  moveEntity(entity, dt) {
    entity.t += entity.speed * dt;
    
    if (entity.t >= 1) {
      entity.t -= 1;
      entity.x += entity.dx;
      entity.y += entity.dy;
      
      // Tunnel wrap
      if (entity.x < 0) entity.x = this.cols - 1;
      if (entity.x >= this.cols) entity.x = 0;
      
      // Update next direction if applicable
      if (entity === this.pacman) {
        if (this.isValidMove(entity.x, entity.y, entity.nextDx, entity.nextDy)) {
          entity.dx = entity.nextDx;
          entity.dy = entity.nextDy;
        } else if (!this.isValidMove(entity.x, entity.y, entity.dx, entity.dy)) {
          entity.dx = 0;
          entity.dy = 0;
        }
      } else {
        // Ghost logic update on tile reach
        this.updateGhostDirection(entity);
      }
    }
    
    // Pixel interpolation
    let px = entity.x;
    let py = entity.y;
    
    if (entity.dx !== 0 || entity.dy !== 0) {
      if (this.isValidMove(entity.x, entity.y, entity.dx, entity.dy)) {
        px += entity.dx * entity.t;
        py += entity.dy * entity.t;
      }
    }
    
    entity.pixelX = px;
    entity.pixelY = py;
  }

  updateGhostDirection(ghost) {
    // Determine target based on ghost personality and mode
    let tx = this.pacman.x;
    let ty = this.pacman.y;
    
    const isFrightened = this.frightenedTimer > 0;
    
    if (isFrightened) {
      // Pick random valid direction
      tx = Math.floor(Math.random() * this.cols);
      ty = Math.floor(Math.random() * this.rows);
    } else {
      if (ghost.id === 'Pinky') {
        tx += this.pacman.dx * 2;
        ty += this.pacman.dy * 2;
      } else if (ghost.id === 'Inky') {
        tx += this.pacman.dx * 1; // Flank loosely
        ty -= this.pacman.dy * 1;
      } else if (ghost.id === 'Clyde') {
        const dist = Math.abs(ghost.x - this.pacman.x) + Math.abs(ghost.y - this.pacman.y);
        if (dist < 5) { // Scatter
          tx = 0;
          ty = this.rows - 1;
        }
      }
    }

    let bestDist = Infinity;
    let bestDx = 0;
    let bestDy = 0;
    let bestDirIndex = 0;
    
    // Try all directions, avoid reversing unless necessary
    const backDx = -ghost.dx;
    const backDy = -ghost.dy;
    
    let validMoves = [];

    for (let i = 0; i < 4; i++) {
      const d = this.dirs[i];
      if (d.dx === backDx && d.dy === backDy && (ghost.dx !== 0 || ghost.dy !== 0)) continue; // Don't reverse
      
      if (this.isValidMove(ghost.x, ghost.y, d.dx, d.dy)) {
        validMoves.push({ d, i });
        const nx = ghost.x + d.dx;
        const ny = ghost.y + d.dy;
        const dist = Math.pow(nx - tx, 2) + Math.pow(ny - ty, 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestDx = d.dx;
          bestDy = d.dy;
          bestDirIndex = i;
        }
      }
    }
    
    if (validMoves.length > 0) {
      if (isFrightened) { // Random move
        const rand = validMoves[Math.floor(Math.random() * validMoves.length)];
        ghost.dx = rand.d.dx;
        ghost.dy = rand.d.dy;
        ghost.dirIndex = rand.i;
      } else {
        ghost.dx = bestDx;
        ghost.dy = bestDy;
        ghost.dirIndex = bestDirIndex;
      }
    } else { // Dead end, reverse
      ghost.dx = backDx;
      ghost.dy = backDy;
      ghost.dirIndex = (ghost.dirIndex + 2) % 4;
    }
  }

  update(dt) {
    if (this.frightenedTimer > 0) {
      this.frightenedTimer -= dt;
      if (this.frightenedTimer <= 0) {
        this.frightenedTimer = 0;
        this.ghosts.forEach(g => g.speed = 4 * 0.7 + (this.level * 0.1));
      }
    }

    this.moveEntity(this.pacman, dt);
    this.ghosts.forEach(g => this.moveEntity(g, dt));

    // Eat pellets
    if (this.maze[this.pacman.y] && this.maze[this.pacman.y][this.pacman.x] !== undefined) {
      const cell = this.maze[this.pacman.y][this.pacman.x];
      if (cell === 0 || cell === 2) {
        this.maze[this.pacman.y][this.pacman.x] = 3;
        this.pelletsCount--;
        
        if (cell === 0) {
          this.addScore(10);
        } else if (cell === 2) {
          this.addScore(50);
          this.frightenedTimer = 7;
          this.ghostEatStreak = 0;
          this.ghosts.forEach(g => {
            g.speed = (4 * 0.7 + (this.level * 0.1)) * 0.5;
            // Reverse direction on frighten
            g.dx *= -1;
            g.dy *= -1;
            g.dirIndex = (g.dirIndex + 2) % 4;
            g.t = 1 - g.t; // Adjust interpolation
          });
        }
        
        if (this.pelletsCount <= 0) {
          this.winLevel = true;
          setTimeout(() => {
            this.level++;
            this.initLevel();
            this.winLevel = false;
          }, 2000);
        }
      }
    }

    // Collisions
    for (let g of this.ghosts) {
      const dist = Math.abs(g.pixelX - this.pacman.pixelX) + Math.abs(g.pixelY - this.pacman.pixelY);
      if (dist < 0.8) {
        if (this.frightenedTimer > 0) {
          // Eat ghost
          this.ghostEatStreak++;
          this.addScore(200 * Math.pow(2, this.ghostEatStreak - 1));
          g.x = 7; g.y = 9; g.pixelX = 7; g.pixelY = 9; g.t = 0;
        } else {
          // Die
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            if (this.callbacks.onGameOver) this.callbacks.onGameOver(this.score);
          } else {
            this.resetPositions();
          }
          break;
        }
      }
    }
  }
  
  addScore(pts) {
    this.score += pts;
    if (this.callbacks.onScoreChange) this.callbacks.onScoreChange(this.score);
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#050515';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);

    this.drawMaze(ctx);
    this.drawPellets(ctx);
    
    if (!this.gameOver) {
      this.drawPacman(ctx);
      this.drawGhosts(ctx);
    }
    
    ctx.restore();

    this.drawUI(ctx);
  }

  drawMaze(ctx) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const s = this.cellSize;
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.maze[r][c] === 1) {
          const x = c * s;
          const y = r * s;
          
          // Simplified wall rendering
          ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
        }
      }
    }
  }

  drawPellets(ctx) {
    const s = this.cellSize;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * s + s / 2;
        const y = r * s + s / 2;
        
        if (this.maze[r][c] === 0) { // Normal pellet
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.maze[r][c] === 2) { // Power pellet
          const pulse = (Math.sin(this.time * 8) + 1) * 0.5;
          ctx.fillStyle = `rgba(253, 224, 71, ${0.5 + pulse * 0.5})`; // Pulse yellow/orange
          ctx.beginPath();
          ctx.arc(x, y, 5 + pulse * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawPacman(ctx) {
    const s = this.cellSize;
    const x = this.pacman.pixelX * s + s / 2;
    const y = this.pacman.pixelY * s + s / 2;
    
    let moving = this.pacman.dx !== 0 || this.pacman.dy !== 0;
    let angle = 0;
    if (moving) {
      angle = (Math.sin(this.time * 15) + 1) * 0.25 * Math.PI;
    } else {
      angle = 0.2 * Math.PI; // slightly open when static
    }

    let rot = 0;
    if (this.pacman.dx === 1) rot = 0;
    else if (this.pacman.dy === 1) rot = Math.PI / 2;
    else if (this.pacman.dx === -1) rot = Math.PI;
    else if (this.pacman.dy === -1) rot = -Math.PI / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.45, angle, Math.PI * 2 - angle);
    ctx.lineTo(0, 0);
    ctx.fill();
    
    ctx.restore();
  }

  drawGhosts(ctx) {
    const s = this.cellSize;
    
    for (let g of this.ghosts) {
      const x = g.pixelX * s + s / 2;
      const y = g.pixelY * s + s / 2;
      
      ctx.save();
      ctx.translate(x, y);
      
      let color = g.color;
      let drawEyes = true;
      let drawPupils = true;
      
      if (this.frightenedTimer > 0) {
        if (this.frightenedTimer < 2 && Math.floor(this.time * 5) % 2 === 0) {
          color = '#ffffff'; // Flash white
          drawEyes = true;
          drawPupils = false; // Just holes or red pupils? Keep it simple
        } else {
          color = '#3b82f6'; // Frightened blue
        }
      }

      ctx.fillStyle = color;
      
      // Dome body
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.45, Math.PI, 0);
      
      // Wavy tentacles
      const numTentacles = 3;
      const tentacleWidth = (s * 0.9) / numTentacles;
      const wave = Math.sin(this.time * 10) * 2;
      
      ctx.lineTo(s * 0.45, s * 0.4);
      for (let i = 1; i <= numTentacles; i++) {
        ctx.lineTo(s * 0.45 - i * tentacleWidth + tentacleWidth/2, s * 0.45 + (i % 2 === 0 ? wave : -wave));
        ctx.lineTo(s * 0.45 - i * tentacleWidth, s * 0.4);
      }
      
      ctx.lineTo(-s * 0.45, s * 0.4);
      ctx.fill();
      
      // Eyes
      if (drawEyes) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-s * 0.15, -s * 0.15, s * 0.12, 0, Math.PI * 2);
        ctx.arc(s * 0.15, -s * 0.15, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        if (drawPupils && this.frightenedTimer <= 0) {
          ctx.fillStyle = '#3b82f6';
          let px = g.dx * 2;
          let py = g.dy * 2;
          ctx.beginPath();
          ctx.arc(-s * 0.15 + px, -s * 0.15 + py, s * 0.05, 0, Math.PI * 2);
          ctx.arc(s * 0.15 + px, -s * 0.15 + py, s * 0.05, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.frightenedTimer > 0) {
          // Frightened face (small zig zag or dot)
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(-s * 0.15, -s * 0.15, s * 0.05, 0, Math.PI * 2);
          ctx.arc(s * 0.15, -s * 0.15, s * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  drawUI(ctx) {
    ctx.save();

    // Bottom Bar (Lives)
    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      const lx = 20 + i * 22;
      const ly = this.height - 14;
      ctx.arc(lx, ly, 6, 0.2 * Math.PI, 1.8 * Math.PI);
      ctx.lineTo(lx, ly);
      ctx.fill();
    }

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(5, 5, 21, 0.85)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 26px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px "Courier New", Courier, monospace';
      ctx.fillText('PRESSIONA QUALQUER BOTÃO', this.width / 2, this.height / 2 + 30);
    } else if (this.winLevel) {
      ctx.fillStyle = 'rgba(5, 5, 21, 0.85)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 26px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FASE CONCLUÍDA!', this.width / 2, this.height / 2);
    }
    ctx.restore();
  }
}
