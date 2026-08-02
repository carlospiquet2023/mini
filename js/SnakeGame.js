import { configureCanvas } from './utils/canvas.js';

const lerp = (a, b, t) => a + (b - a) * t;

export default class SnakeGame {
  #canvas;
  #ctx;
  #callbacks;
  #rafId = null;
  #lastTime = 0;
  #timeSinceLastTick = 0;
  #tickInterval = 150;
  
  #logicalWidth = 0;
  #logicalHeight = 0;
  #cellSize = 18;
  #gridW = 0;
  #gridH = 0;
  #offsetX = 0;
  #offsetY = 40; // Space for UI

  #snake = [];
  #prevSnake = [];
  #direction = { x: 1, y: 0 };
  #nextDirection = { x: 1, y: 0 };
  #food = { x: 0, y: 0 };
  #score = 0;
  #gameOver = false;
  #initialized = false;
  
  #dirtParticles = [];
  #particles = [];

  constructor(canvas, ctx, callbacks) {
    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#callbacks = callbacks || {};
  }

  start() {
    if (this.#rafId !== null) return;
    if (!this.#initialized) this.restart();
    this.#lastTime = performance.now();
    this.#rafId = requestAnimationFrame((ts) => this.#render(ts));
  }

  stop() {
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  resize(width, height) {
    const oldHead = this.#snake[0] ? { ...this.#snake[0] } : null;
    const size = configureCanvas(this.#canvas, this.#ctx, width, height);
    this.#logicalWidth = size.width;
    this.#logicalHeight = size.height;

    this.#cellSize = 18;
    this.#gridW = Math.max(6, Math.floor(size.width / this.#cellSize));
    this.#gridH = Math.max(6, Math.floor((size.height - 40) / this.#cellSize));
    
    this.#offsetX = (size.width - this.#gridW * this.#cellSize) / 2;
    this.#offsetY = 40 + (size.height - 40 - this.#gridH * this.#cellSize) / 2;

    if (oldHead && this.#initialized) {
      const target = { x: Math.floor(this.#gridW / 2), y: Math.floor(this.#gridH / 2) };
      const translate = (part) => ({
        x: Math.max(0, Math.min(this.#gridW - 1, target.x + part.x - oldHead.x)),
        y: Math.max(0, Math.min(this.#gridH - 1, target.y + part.y - oldHead.y))
      });
      this.#snake = this.#snake.map(translate);
      this.#prevSnake = this.#prevSnake.map(translate);
      if (this.#food.x >= this.#gridW || this.#food.y >= this.#gridH) this.#spawnFood();
    }
    
    this.#generateDirt(size.width, size.height);
  }

  onDirection(dir, pressed) {
    if (!pressed) return;
    if (this.#gameOver) {
      this.restart();
      return;
    }
    if (dir === 'up' && this.#direction.y !== 1) this.#nextDirection = { x: 0, y: -1 };
    else if (dir === 'down' && this.#direction.y !== -1) this.#nextDirection = { x: 0, y: 1 };
    else if (dir === 'left' && this.#direction.x !== 1) this.#nextDirection = { x: -1, y: 0 };
    else if (dir === 'right' && this.#direction.x !== -1) this.#nextDirection = { x: 1, y: 0 };
  }

  onButtonADown() {
    if (this.#gameOver) {
      this.restart();
      return;
    }
    this.#nextDirection = { x: this.#nextDirection.y, y: -this.#nextDirection.x };
  }

  onButtonAUp() {}

  onButtonBDown() {
    if (this.#gameOver) {
      this.restart();
      return;
    }
    this.#nextDirection = { x: -this.#nextDirection.y, y: this.#nextDirection.x };
  }

  onButtonBUp() {}

  restart() {
    this.#snake = [];
    const cx = Math.floor(this.#gridW / 2);
    const cy = Math.floor(this.#gridH / 2);
    this.#snake.push({ x: cx, y: cy });
    this.#snake.push({ x: cx - 1, y: cy });
    this.#snake.push({ x: cx - 2, y: cy });
    this.#prevSnake = structuredClone(this.#snake);

    this.#direction = { x: 1, y: 0 };
    this.#nextDirection = { x: 1, y: 0 };
    this.#score = 0;
    this.#tickInterval = 150;
    this.#gameOver = false;
    this.#particles = [];
    this.#timeSinceLastTick = 0;
    this.#initialized = true;

    if (this.#callbacks.onScoreChange) {
      this.#callbacks.onScoreChange(this.#score);
    }

    this.#spawnFood();
  }

  #generateDirt(w, h) {
    this.#dirtParticles = [];
    const count = Math.floor(w * h / 500);
    const colors = ['#3d2317', '#4a2c1d', '#2b170e'];
    for (let i = 0; i < count; i++) {
      this.#dirtParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.5,
        c: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  #spawnFood() {
    let valid = false;
    while (!valid) {
      this.#food = {
        x: Math.floor(Math.random() * this.#gridW),
        y: Math.floor(Math.random() * this.#gridH)
      };
      valid = true;
      for (const seg of this.#snake) {
        if (seg.x === this.#food.x && seg.y === this.#food.y) {
          valid = false;
          break;
        }
      }
    }
  }

  #tick() {
    this.#prevSnake = structuredClone(this.#snake);
    this.#direction = this.#nextDirection;

    const head = this.#snake[0];
    const newHead = { x: head.x + this.#direction.x, y: head.y + this.#direction.y };

    if (newHead.x < 0 || newHead.x >= this.#gridW || newHead.y < 0 || newHead.y >= this.#gridH) {
      this.#triggerGameOver();
      return;
    }

    for (const segment of this.#snake) {
      if (segment.x === newHead.x && segment.y === newHead.y) {
        this.#triggerGameOver();
        return;
      }
    }

    this.#snake.unshift(newHead);

    if (newHead.x === this.#food.x && newHead.y === this.#food.y) {
      this.#score++;
      if (this.#callbacks.onScoreChange) {
        this.#callbacks.onScoreChange(this.#score);
      }
      this.#tickInterval = Math.max(70, 150 - this.#score * 2);
      this.#spawnParticles(this.#food.x, this.#food.y);
      this.#spawnFood();
    } else {
      this.#snake.pop();
    }
  }

  #triggerGameOver() {
    this.#gameOver = true;
    if (this.#callbacks.onGameOver) {
      this.#callbacks.onGameOver(this.#score);
    }
  }

  #spawnParticles(gx, gy) {
    const x = this.#offsetX + gx * this.#cellSize + this.#cellSize / 2;
    const y = this.#offsetY + gy * this.#cellSize + this.#cellSize / 2;
    const colors = ['#4ade80', '#a3e635', '#fbbf24'];

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.#particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.random() * 3 + 2
      });
    }
  }

  #render(timestamp) {
    if (!this.#lastTime) this.#lastTime = timestamp;
    const dt = timestamp - this.#lastTime;
    this.#lastTime = timestamp;

    if (!this.#gameOver) {
      this.#timeSinceLastTick += dt;
      while (this.#timeSinceLastTick >= this.#tickInterval) {
        this.#timeSinceLastTick -= this.#tickInterval;
        this.#tick();
      }
    }

    this.#drawBackground();
    this.#drawFood(timestamp);
    this.#drawParticles(dt);
    this.#drawSnake();
    this.#drawUI();
    if (this.#gameOver) this.#drawGameOver(timestamp);

    this.#rafId = requestAnimationFrame((ts) => this.#render(ts));
  }

  #drawBackground() {
    const ctx = this.#ctx;
    const w = this.#logicalWidth;
    const h = this.#logicalHeight;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a0f0a');
    grad.addColorStop(1, '#3d2317');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (const d of this.#dirtParticles) {
      ctx.fillStyle = d.c;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.#gridW; x++) {
      const px = this.#offsetX + x * this.#cellSize;
      ctx.moveTo(px, this.#offsetY);
      ctx.lineTo(px, this.#offsetY + this.#gridH * this.#cellSize);
    }
    for (let y = 0; y <= this.#gridH; y++) {
      const py = this.#offsetY + y * this.#cellSize;
      ctx.moveTo(this.#offsetX, py);
      ctx.lineTo(this.#offsetX + this.#gridW * this.#cellSize, py);
    }
    ctx.stroke();

    ctx.strokeStyle = '#1b3b22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.2, h - 30, w * 0.4, h);
    ctx.moveTo(w * 0.6, h);
    ctx.quadraticCurveTo(w * 0.8, h - 40, w, h);
    ctx.stroke();
  }

  #drawUI() {
    const ctx = this.#ctx;
    const w = this.#logicalWidth;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, w, 40);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillText(`🐛 Pontos: ${this.#score}`, 15, 20);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  #drawFood(timestamp) {
    const ctx = this.#ctx;
    const x = this.#offsetX + this.#food.x * this.#cellSize + this.#cellSize / 2;
    const y = this.#offsetY + this.#food.y * this.#cellSize + this.#cellSize / 2;

    const pulse = Math.sin(timestamp * 0.005);
    const scale = 1 + pulse * 0.1;
    const blur = 10 + pulse * 5;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = blur;

    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(0, 0, this.#cellSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(0, -this.#cellSize * 0.35, this.#cellSize * 0.15, 0, Math.PI, true);
    ctx.fill();

    ctx.restore();
  }

  #drawParticles() {
    const ctx = this.#ctx;
    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const p = this.#particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life--;

      if (p.life <= 0) {
        this.#particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  #drawSnake() {
    const progress = this.#gameOver ? 1 : Math.min(1, this.#timeSinceLastTick / this.#tickInterval);
    const ctx = this.#ctx;

    const renderCoords = this.#snake.map((seg, i) => {
      const prev = this.#prevSnake[i] || seg;
      return {
        x: this.#offsetX + lerp(prev.x, seg.x, progress) * this.#cellSize + this.#cellSize / 2,
        y: this.#offsetY + lerp(prev.y, seg.y, progress) * this.#cellSize + this.#cellSize / 2
      };
    });

    for (let i = renderCoords.length - 1; i >= 0; i--) {
      const coord = renderCoords[i];
      let r = this.#cellSize * 0.45;
      if (i === 0) r = this.#cellSize * 0.55;
      else if (i === renderCoords.length - 1) r = this.#cellSize * 0.45 * 0.7;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      if (i === 0) {
        const grad = ctx.createRadialGradient(coord.x, coord.y, 0, coord.x, coord.y, r);
        grad.addColorStop(0, '#f0b0c8');
        grad.addColorStop(1, '#c4785c');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(coord.x, coord.y, r, 0, Math.PI * 2);
        ctx.fill();

        const prevHead = this.#prevSnake[0] || this.#snake[0];
        const dirX = this.#snake[0].x - prevHead.x || this.#direction.x;
        const dirY = this.#snake[0].y - prevHead.y || this.#direction.y;
        const len = Math.hypot(dirX, dirY) || 1;
        const nx = dirX / len;
        const ny = dirY / len;

        const eyeOffset = r * 0.5;
        const eyeSpace = r * 0.5;

        const leftEyeX = coord.x + nx * eyeOffset - ny * eyeSpace;
        const leftEyeY = coord.y + ny * eyeOffset + nx * eyeSpace;
        const rightEyeX = coord.x + nx * eyeOffset + ny * eyeSpace;
        const rightEyeY = coord.y + ny * eyeOffset - nx * eyeSpace;

        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(leftEyeX, leftEyeY, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rightEyeX, rightEyeY, 3, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(leftEyeX + nx, leftEyeY + ny, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rightEyeX + nx, rightEyeY + ny, 1.5, 0, Math.PI * 2); ctx.fill();
      } else {
        const ratio = i / renderCoords.length;
        const mixPercent = Math.round(100 - ratio * 40);
        ctx.fillStyle = `color-mix(in srgb, #c4785c ${mixPercent}%, #593527)`;
        ctx.beginPath();
        ctx.arc(coord.x, coord.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  #drawGameOver(timestamp) {
    const ctx = this.#ctx;
    const w = this.#logicalWidth;
    const h = this.#logicalHeight;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    const pulse = 1 + Math.sin(timestamp * 0.003) * 0.05;
    ctx.scale(pulse, pulse);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;

    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('GAME OVER', 0, -30);

    ctx.font = '24px sans-serif';
    ctx.fillText(`Pontos: ${this.#score}`, 0, 10);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Pressione qualquer botão', 0, 50);

    ctx.restore();
  }
}
