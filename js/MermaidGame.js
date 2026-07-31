/* ===========================================
   MermaidGame — Aventura da Sereia & Borboleta
   Realistic & Elegant Mermaid Swim Adventure
   Canvas 2D with Fluid Physics, Shimmering Tail,
   Flowing Hair, Pearl Collections & Magic Butterfly
   =========================================== */

export default class MermaidGame {
  #canvas;
  #ctx;
  #callbacks;
  #width = 300;
  #height = 500;
  #isRunning = false;
  #lastTime = 0;
  #animationFrameId = null;
  #shakeAmount = 0;

  // Game Constants
  #speed = 220;
  #worldTime = 0;

  // State
  #state = 'PLAYING'; // 'PLAYING', 'GAMEOVER'
  #score = 0;
  #level = 1;
  #lives = 3;
  #pearlsCollected = 0;
  #levelGoal = 8;
  #invulnerableTimer = 0;

  // Controls
  #upPressed = false;
  #downPressed = false;
  #leftPressed = false;
  #rightPressed = false;

  // Player (Realistic Mermaid)
  #player = {
    x: 70,
    y: 250,
    r: 22,
    vx: 0,
    vy: 0,
    tilt: 0,
    starTimer: 0
  };

  // Companion Butterfly
  #butterfly = {
    x: 40,
    y: 210,
    wingAnim: 0
  };

  // World Objects & FX
  #pearls = [];
  #obstacles = [];
  #powerups = [];
  #particles = [];
  #bubbles = [];
  #fish = [];
  #lightRays = [];

  constructor(canvas, ctx, callbacks = {}) {
    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#callbacks = callbacks;
  }

  start() {
    if (this.#isRunning) return;
    this.#isRunning = true;

    const dpr = window.devicePixelRatio || 1;
    this.#canvas.width = this.#width * dpr;
    this.#canvas.height = this.#height * dpr;
    this.#canvas.style.width = this.#width + 'px';
    this.#canvas.style.height = this.#height + 'px';
    this.#ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.#ctx.scale(dpr, dpr);

    this.#initOceanWorld();
    this.restart();

    this.#lastTime = performance.now();
    this.#gameLoop(this.#lastTime);
  }

  stop() {
    this.#isRunning = false;
    if (this.#animationFrameId) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
  }

  restart() {
    this.#state = 'PLAYING';
    this.#score = 0;
    this.#level = 1;
    this.#lives = 3;
    this.#pearlsCollected = 0;
    this.#levelGoal = 8;
    this.#invulnerableTimer = 0;
    this.#shakeAmount = 0;

    this.#player = {
      x: Math.floor(this.#width * 0.25),
      y: Math.floor(this.#height * 0.5),
      r: 22,
      vx: 0,
      vy: 0,
      tilt: 0,
      starTimer: 0
    };

    this.#butterfly = {
      x: this.#player.x - 30,
      y: this.#player.y - 35,
      wingAnim: 0
    };

    this.#pearls = [];
    this.#obstacles = [];
    this.#powerups = [];
    this.#particles = [];

    this.#spawnPearl();
    if (this.#callbacks.onScoreChange) this.#callbacks.onScoreChange(this.#score);
  }

  resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    this.#width = width;
    this.#height = height;
    this.#canvas.width = width * dpr;
    this.#canvas.height = height * dpr;
    this.#canvas.style.width = width + 'px';
    this.#canvas.style.height = height + 'px';
    this.#ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.#ctx.scale(dpr, dpr);

    this.#initOceanWorld();
  }

  onDirection(dir, pressed) {
    if (this.#state !== 'PLAYING') {
      if (pressed) this.restart();
      return;
    }
    if (dir === 'up') this.#upPressed = pressed;
    if (dir === 'down') this.#downPressed = pressed;
    if (dir === 'left') this.#leftPressed = pressed;
    if (dir === 'right') this.#rightPressed = pressed;
  }

  onButtonADown() {
    if (this.#state !== 'PLAYING') {
      this.restart();
      return;
    }
    this.#dash();
  }
  onButtonAUp() {}

  onButtonBDown() {
    if (this.#state !== 'PLAYING') {
      this.restart();
      return;
    }
    this.#dash();
  }
  onButtonBUp() {}

  #dash() {
    // Water Dash Impulse
    this.#player.vx = 280;
    for (let i = 0; i < 12; i++) {
      this.#particles.push({
        x: this.#player.x - 15,
        y: this.#player.y + (Math.random() - 0.5) * 20,
        vx: -80 - Math.random() * 60,
        vy: (Math.random() - 0.5) * 40,
        color: '#a5f3fc',
        life: 0.4, maxLife: 0.4, r: 2.5
      });
    }
  }

  #gameLoop(currentTime) {
    if (!this.#isRunning) return;
    const dt = Math.min((currentTime - this.#lastTime) / 1000, 0.1);
    this.#lastTime = currentTime;

    this.#update(dt);
    this.#draw();

    this.#animationFrameId = requestAnimationFrame((t) => this.#gameLoop(t));
  }

  #initOceanWorld() {
    this.#bubbles = [];
    for (let i = 0; i < 20; i++) {
      this.#bubbles.push({
        x: Math.random() * this.#width,
        y: Math.random() * this.#height,
        r: 1.5 + Math.random() * 3.5,
        speed: 15 + Math.random() * 35,
        sway: 1.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.#fish = [];
    for (let i = 0; i < 6; i++) {
      this.#fish.push({
        x: Math.random() * this.#width,
        y: 40 + Math.random() * (this.#height - 100),
        size: 8 + Math.random() * 6,
        speed: 25 + Math.random() * 45,
        dir: Math.random() < 0.5 ? 1 : -1,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.5 ? '#f472b6' : '#38bdf8'
      });
    }

    this.#lightRays = [];
    for (let i = 0; i < 4; i++) {
      this.#lightRays.push({
        x: i * (this.#width / 3),
        w: 30 + Math.random() * 40,
        alpha: 0.08 + Math.random() * 0.12,
        drift: Math.random() < 0.5 ? 8 : -8
      });
    }
  }

  #update(dt) {
    if (this.#shakeAmount > 0) {
      this.#shakeAmount = Math.max(0, this.#shakeAmount - dt * 30);
    }

    if (this.#state === 'GAMEOVER') return;

    this.#worldTime += dt;
    this.#butterfly.wingAnim += dt * 12;

    if (this.#invulnerableTimer > 0) this.#invulnerableTimer -= dt;
    if (this.#player.starTimer > 0) this.#player.starTimer -= dt;

    // Player Directional Movement
    let targetVx = 0;
    let targetVy = 0;
    const moveSpeed = 220;

    if (this.#upPressed) targetVy -= moveSpeed;
    if (this.#downPressed) targetVy += moveSpeed;
    if (this.#leftPressed) targetVx -= moveSpeed;
    if (this.#rightPressed) targetVx += moveSpeed;

    // Smooth Velocity Damping
    this.#player.vx += (targetVx - this.#player.vx) * 8 * dt;
    this.#player.vy += (targetVy - this.#player.vy) * 8 * dt;

    this.#player.x += this.#player.vx * dt;
    this.#player.y += this.#player.vy * dt;

    // Bound to Canvas
    this.#player.x = Math.max(25, Math.min(this.#width - 25, this.#player.x));
    this.#player.y = Math.max(35, Math.min(this.#height - 40, this.#player.y));

    // Tilt angle based on vertical movement
    this.#player.tilt = (this.#player.vy / moveSpeed) * 0.25;

    // Butterfly follows Mermaid smoothly
    const targetBfX = this.#player.x - 28;
    const targetBfY = this.#player.y - 32 + Math.sin(this.#worldTime * 4) * 6;
    this.#butterfly.x += (targetBfX - this.#butterfly.x) * 5 * dt;
    this.#butterfly.y += (targetBfY - this.#butterfly.y) * 5 * dt;

    // Update Bubbles & Fish
    for (const b of this.#bubbles) {
      b.y -= b.speed * dt;
      b.x += Math.sin(this.#worldTime * b.sway + b.phase) * 10 * dt;
      if (b.y < -10) {
        b.y = this.#height + 10;
        b.x = Math.random() * this.#width;
      }
    }
    for (const f of this.#fish) {
      f.x += f.speed * f.dir * dt;
      f.y += Math.sin(this.#worldTime * 2 + f.phase) * 6 * dt;
      if (f.dir > 0 && f.x > this.#width + 30) f.x = -30;
      if (f.dir < 0 && f.x < -30) f.x = this.#width + 30;
    }

    // Spawners (Pearls & Obstacles)
    if (this.#pearls.length < 3) {
      this.#spawnPearl();
    }
    if (Math.random() < 0.02 && this.#obstacles.length < 4) {
      this.#spawnObstacle();
    }

    // Update Pearls
    for (let i = this.#pearls.length - 1; i >= 0; i--) {
      const p = this.#pearls[i];
      p.x -= 30 * dt;
      p.anim += dt * 3;
      if (p.x < -20) this.#pearls.splice(i, 1);
    }

    // Update Obstacles (Jellyfish &Urchins)
    for (let i = this.#obstacles.length - 1; i >= 0; i--) {
      const obs = this.#obstacles[i];
      obs.x -= (this.#speed * 0.7) * dt;
      obs.anim += dt * 4;
      if (obs.x < -40) this.#obstacles.splice(i, 1);
    }

    // Update Particles
    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const pt = this.#particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) this.#particles.splice(i, 1);
    }

    // Collision Checks
    this.#checkCollisions();
  }

  #spawnPearl() {
    this.#pearls.push({
      x: this.#width + 20 + Math.random() * 60,
      y: 50 + Math.random() * (this.#height - 120),
      r: 9,
      anim: Math.random() * Math.PI * 2
    });
  }

  #spawnObstacle() {
    const isJelly = Math.random() < 0.6;
    this.#obstacles.push({
      type: isJelly ? 'jelly' : 'urchin',
      x: this.#width + 30,
      y: 60 + Math.random() * (this.#height - 140),
      r: isJelly ? 16 : 14,
      anim: Math.random() * Math.PI * 2
    });
  }

  #checkCollisions() {
    // Player vs Pearls
    for (let i = this.#pearls.length - 1; i >= 0; i--) {
      const p = this.#pearls[i];
      const dist = Math.hypot(this.#player.x - p.x, this.#player.y - p.y);
      if (dist < this.#player.r + p.r) {
        this.#score += 15;
        this.#pearlsCollected++;
        if (this.#callbacks.onScoreChange) this.#callbacks.onScoreChange(this.#score);

        // Pearl Collect Particles
        for (let k = 0; k < 12; k++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 50 + Math.random() * 80;
          this.#particles.push({
            x: p.x, y: p.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: '#a5f3fc', life: 0.4, maxLife: 0.4, r: 2.5
          });
        }
        this.#pearls.splice(i, 1);

        // Level Up Check
        if (this.#pearlsCollected >= this.#levelGoal) {
          this.#level++;
          this.#pearlsCollected = 0;
          this.#levelGoal += 4;
          this.#speed += 25;
        }
      }
    }

    // Player vs Obstacles
    if (this.#invulnerableTimer <= 0) {
      for (let i = this.#obstacles.length - 1; i >= 0; i--) {
        const obs = this.#obstacles[i];
        const dist = Math.hypot(this.#player.x - obs.x, this.#player.y - obs.y);
        if (dist < this.#player.r + obs.r) {
          this.#lives--;
          this.#shakeAmount = 16;
          this.#invulnerableTimer = 1.6;

          for (let k = 0; k < 15; k++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 100;
            this.#particles.push({
              x: obs.x, y: obs.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              color: '#f472b6', life: 0.4, maxLife: 0.4, r: 3
            });
          }

          if (this.#lives <= 0) {
            this.#state = 'GAMEOVER';
            if (this.#callbacks.onGameOver) this.#callbacks.onGameOver(this.#score);
          }
        }
      }
    }
  }

  #draw() {
    this.#ctx.save();

    if (this.#shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * this.#shakeAmount;
      const sy = (Math.random() - 0.5) * this.#shakeAmount;
      this.#ctx.translate(sx, sy);
    }

    // Deep Ocean Background Gradient
    const oceanGrad = this.#ctx.createLinearGradient(0, 0, 0, this.#height);
    oceanGrad.addColorStop(0, '#0284c7');
    oceanGrad.addColorStop(0.35, '#0369a1');
    oceanGrad.addColorStop(0.7, '#075985');
    oceanGrad.addColorStop(1, '#0c4a6e');
    this.#ctx.fillStyle = oceanGrad;
    this.#ctx.fillRect(0, 0, this.#width, this.#height);

    // Sun Rays
    this.#ctx.save();
    this.#ctx.globalCompositeOperation = 'screen';
    for (const r of this.#lightRays) {
      const rayGrad = this.#ctx.createLinearGradient(r.x, 0, r.x + r.w, this.#height);
      rayGrad.addColorStop(0, `rgba(186, 230, 253, ${r.alpha})`);
      rayGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
      this.#ctx.fillStyle = rayGrad;
      this.#ctx.beginPath();
      this.#ctx.moveTo(r.x, 0);
      this.#ctx.lineTo(r.x + r.w, 0);
      this.#ctx.lineTo(r.x + r.w * 2, this.#height);
      this.#ctx.lineTo(r.x + r.w * 0.5, this.#height);
      this.#ctx.closePath();
      this.#ctx.fill();
    }
    this.#ctx.restore();

    // Sandy Ocean Floor
    const sandGrad = this.#ctx.createLinearGradient(0, this.#height - 50, 0, this.#height);
    sandGrad.addColorStop(0, '#0f766e');
    sandGrad.addColorStop(1, '#115e59');
    this.#ctx.fillStyle = sandGrad;
    this.#ctx.beginPath();
    this.#ctx.moveTo(0, this.#height - 40);
    for (let x = 0; x <= this.#width; x += 20) {
      const y = this.#height - 40 + Math.sin(x * 0.05 + this.#worldTime) * 4;
      this.#ctx.lineTo(x, y);
    }
    this.#ctx.lineTo(this.#width, this.#height);
    this.#ctx.lineTo(0, this.#height);
    this.#ctx.fill();

    // Ambient Bubbles & Fish
    for (const b of this.#bubbles) {
      this.#ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
      this.#ctx.lineWidth = 1;
      this.#ctx.beginPath();
      this.#ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      this.#ctx.stroke();
    }
    for (const f of this.#fish) {
      this.#ctx.save();
      this.#ctx.translate(f.x, f.y);
      this.#ctx.scale(f.dir, 1);
      this.#ctx.fillStyle = f.color;
      this.#ctx.beginPath();
      this.#ctx.ellipse(0, 0, f.size, f.size * 0.4, 0, 0, Math.PI * 2);
      this.#ctx.fill();
      this.#ctx.restore();
    }

    // Pearls
    for (const p of this.#pearls) {
      const bob = Math.sin(p.anim) * 4;
      this.#ctx.save();
      this.#ctx.translate(p.x, p.y + bob);
      this.#ctx.shadowBlur = 12;
      this.#ctx.shadowColor = '#bae6fd';
      this.#ctx.fillStyle = '#f0fdf4';
      this.#ctx.strokeStyle = '#38bdf8';
      this.#ctx.lineWidth = 1.5;
      this.#ctx.beginPath();
      this.#ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      this.#ctx.fill();
      this.#ctx.stroke();
      this.#ctx.restore();
    }

    // Obstacles (Jellyfish & Urchins)
    for (const obs of this.#obstacles) {
      this.#drawObstacle(obs);
    }

    // Particles
    for (const pt of this.#particles) {
      this.#ctx.save();
      this.#ctx.globalAlpha = pt.life / pt.maxLife;
      this.#ctx.fillStyle = pt.color;
      this.#ctx.beginPath();
      this.#ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      this.#ctx.fill();
      this.#ctx.restore();
    }

    // REALISTIC & BEAUTIFUL MERMAID (Sereia Encantada)
    if (this.#invulnerableTimer <= 0 || Math.floor(performance.now() / 100) % 2 === 0) {
      this.#drawBeautifulMermaid();
    }

    // MAGIC BUTTERFLY COMPANION (Borboleta Luminescente)
    this.#drawMagicButterfly();

    // Top UI Bar (Lives & Level)
    this.#ctx.save();
    this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.#ctx.fillRect(0, 0, this.#width, 24);

    this.#ctx.font = 'bold 12px Fredoka, sans-serif';
    this.#ctx.textBaseline = 'middle';

    let hearts = '';
    for (let i = 0; i < 3; i++) hearts += i < this.#lives ? '❤️ ' : '💔 ';
    this.#ctx.fillStyle = '#ffffff';
    this.#ctx.fillText(hearts, 8, 12);

    this.#ctx.fillStyle = '#38bdf8';
    this.#ctx.textAlign = 'right';
    this.#ctx.fillText(`FASE ${this.#level}`, this.#width - 8, 12);
    this.#ctx.restore();

    // Game Over Overlay
    if (this.#state === 'GAMEOVER') {
      this.#ctx.save();
      this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      this.#ctx.fillRect(0, 0, this.#width, this.#height);

      this.#ctx.fillStyle = '#ffffff';
      this.#ctx.font = 'bold 28px Fredoka, sans-serif';
      this.#ctx.textAlign = 'center';
      this.#ctx.shadowColor = '#f472b6';
      this.#ctx.shadowBlur = 12;
      this.#ctx.fillText('FIM DE JOGO', this.#width / 2, this.#height * 0.4);

      this.#ctx.font = 'bold 16px Fredoka, sans-serif';
      this.#ctx.shadowColor = '#000000';
      this.#ctx.shadowBlur = 4;
      this.#ctx.fillText(`Pontuação: ${this.#score}`, this.#width / 2, this.#height * 0.52);

      this.#ctx.fillStyle = '#38bdf8';
      this.#ctx.font = '14px Fredoka, sans-serif';
      this.#ctx.fillText('Pressione qualquer botão para tentar novamente', this.#width / 2, this.#height * 0.72);
      this.#ctx.restore();
    }

    this.#ctx.restore();
  }

  #drawBeautifulMermaid() {
    this.#ctx.save();
    this.#ctx.translate(this.#player.x, this.#player.y);
    this.#ctx.rotate(this.#player.tilt);

    const tailWave = Math.sin(this.#worldTime * 5.5);
    const hairWave1 = Math.sin(this.#worldTime * 3.5);
    const hairWave2 = Math.cos(this.#worldTime * 2.8);
    const swim = Math.sin(this.#worldTime * 6.0);

    // 1. BACK HAIR LOCKS (Cabelos de Trás em Camadas)
    const backHairGrad = this.#ctx.createLinearGradient(-35, -35, 10, 0);
    backHairGrad.addColorStop(0, '#3b0764');
    backHairGrad.addColorStop(0.5, '#7e22ce');
    backHairGrad.addColorStop(1, '#c084fc');
    this.#ctx.fillStyle = backHairGrad;

    this.#ctx.beginPath();
    this.#ctx.moveTo(10, -25);
    this.#ctx.bezierCurveTo(-10, -32 + hairWave1 * 4, -30, -25 + hairWave2 * 5, -42, -10 + hairWave1 * 4);
    this.#ctx.bezierCurveTo(-30, -2, -15, -8, 5, -12);
    this.#ctx.closePath();
    this.#ctx.fill();

    // 2. MAJESTIC TAIL (Cauda de Sereia Iridescente)
    const tailGrad = this.#ctx.createLinearGradient(-55, 0, 15, 0);
    tailGrad.addColorStop(0, '#0284c7');
    tailGrad.addColorStop(0.35, '#0d9488');
    tailGrad.addColorStop(0.7, '#2dd4bf');
    tailGrad.addColorStop(1, '#a7f3d0');
    this.#ctx.fillStyle = tailGrad;
    this.#ctx.shadowBlur = 14;
    this.#ctx.shadowColor = '#2dd4bf';

    this.#ctx.beginPath();
    this.#ctx.moveTo(10, 5);
    this.#ctx.bezierCurveTo(-15, 15, -35, 18, -55, 10 + tailWave * 5);
    this.#ctx.bezierCurveTo(-42, -5 + tailWave * 2, -25, -10, 10, -5);
    this.#ctx.closePath();
    this.#ctx.fill();

    // Scales Highlight Overlay
    this.#ctx.save();
    this.#ctx.globalAlpha = 0.35;
    this.#ctx.strokeStyle = '#ffffff';
    this.#ctx.lineWidth = 1;
    for (let col = 0; col < 5; col++) {
      const sx = -5 - col * 9;
      const sy = 2 - col * 1.5;
      this.#ctx.beginPath();
      this.#ctx.arc(sx, sy, 4.5, 0.2, Math.PI - 0.2);
      this.#ctx.stroke();
    }
    this.#ctx.restore();

    // Translucent Fairy Caudal Fins (Nadadeiras Duplas de Fada)
    const finGrad = this.#ctx.createLinearGradient(-75, -25, -45, 35);
    finGrad.addColorStop(0, 'rgba(167, 243, 208, 0.9)');
    finGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.85)');
    finGrad.addColorStop(1, 'rgba(2, 132, 199, 0.8)');
    this.#ctx.fillStyle = finGrad;

    // Upper Fin
    this.#ctx.beginPath();
    this.#ctx.moveTo(-55, 10 + tailWave * 5);
    this.#ctx.bezierCurveTo(-68, -5 + tailWave * 7, -78, -24, -66, -28);
    this.#ctx.bezierCurveTo(-54, -16, -50, -4, -55, 10 + tailWave * 5);
    this.#ctx.fill();

    // Lower Fin
    this.#ctx.beginPath();
    this.#ctx.moveTo(-55, 10 + tailWave * 5);
    this.#ctx.bezierCurveTo(-68, 24 + tailWave * 7, -78, 42, -66, 46);
    this.#ctx.bezierCurveTo(-54, 32, -50, 18, -55, 10 + tailWave * 5);
    this.#ctx.fill();

    // 3. ELEGANT TORSO & PORCELAIN SKIN
    this.#ctx.shadowBlur = 0;
    this.#ctx.fillStyle = '#fff7ed'; // Soft porcelain skin

    // Waist & Hips
    this.#ctx.beginPath();
    this.#ctx.ellipse(10, 0, 12, 9, 0, 0, Math.PI * 2);
    this.#ctx.fill();

    // Torso & Chest
    this.#ctx.beginPath();
    this.#ctx.ellipse(18, -6, 10, 8, -0.15, 0, Math.PI * 2);
    this.#ctx.fill();

    // Seashell Bra (Conchas Violeta Amethyst)
    const shellGrad = this.#ctx.createRadialGradient(18, -9, 1, 18, -6, 8);
    shellGrad.addColorStop(0, '#e9d5ff');
    shellGrad.addColorStop(0.6, '#c084fc');
    shellGrad.addColorStop(1, '#7e22ce');
    this.#ctx.fillStyle = shellGrad;

    this.#ctx.beginPath();
    this.#ctx.arc(17, -9, 4.5, 0, Math.PI * 2);
    this.#ctx.arc(17, -2, 4.5, 0, Math.PI * 2);
    this.#ctx.fill();

    // Pearl Necklace (Colar de Pérolas)
    this.#ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      this.#ctx.beginPath();
      this.#ctx.arc(22 + i * 2, -14 + i * 1.5, 1.2, 0, Math.PI * 2);
      this.#ctx.fill();
    }

    // Swimming Arms (Braços Nadando com Estilo)
    this.#ctx.strokeStyle = '#fff7ed';
    this.#ctx.lineWidth = 3.5;
    this.#ctx.lineCap = 'round';
    this.#ctx.beginPath();
    this.#ctx.moveTo(22, -10);
    this.#ctx.quadraticCurveTo(32, -14, 38, -6 + swim * 3);
    this.#ctx.stroke();

    // 4. BEAUTIFUL REALISTIC HEAD & FACE (Rosto Princesa Disney)
    // Head Contour
    this.#ctx.fillStyle = '#fff7ed';
    this.#ctx.beginPath();
    this.#ctx.ellipse(26, -18, 9, 10.5, 0.05, 0, Math.PI * 2);
    this.#ctx.fill();

    // Cheek Blush (Rubor Rosado Fofo)
    this.#ctx.fillStyle = 'rgba(244, 114, 182, 0.4)';
    this.#ctx.beginPath();
    this.#ctx.ellipse(30, -15, 3.5, 2.5, 0, 0, Math.PI * 2);
    this.#ctx.fill();

    // Expressive Eye (Olhos de Esmeralda Brilhantes)
    // Eyebrow
    this.#ctx.strokeStyle = '#451a03';
    this.#ctx.lineWidth = 1.2;
    this.#ctx.beginPath();
    this.#ctx.quadraticCurveTo(28, -23, 33, -21);
    this.#ctx.stroke();

    // Iris & Pupil
    const eyeGrad = this.#ctx.createLinearGradient(29, -21, 32, -16);
    eyeGrad.addColorStop(0, '#047857');
    eyeGrad.addColorStop(0.5, '#10b981');
    eyeGrad.addColorStop(1, '#67e8f9');
    this.#ctx.fillStyle = eyeGrad;
    this.#ctx.beginPath();
    this.#ctx.ellipse(31, -18, 2.2, 2.8, 0.1, 0, Math.PI * 2);
    this.#ctx.fill();

    // Eyelashes (Cílios)
    this.#ctx.strokeStyle = '#020617';
    this.#ctx.lineWidth = 1.5;
    this.#ctx.beginPath();
    this.#ctx.arc(31, -19.5, 2.5, Math.PI * 1.1, Math.PI * 1.9);
    this.#ctx.stroke();

    // Eye Sparkle Highlight
    this.#ctx.fillStyle = '#ffffff';
    this.#ctx.beginPath();
    this.#ctx.arc(32, -19, 0.9, 0, Math.PI * 2);
    this.#ctx.fill();

    // Delicate Nose & Lips
    this.#ctx.fillStyle = '#f43f5e'; // Soft Pink Smile
    this.#ctx.beginPath();
    this.#ctx.arc(33, -12, 1.6, 0, Math.PI * 2);
    this.#ctx.fill();

    // 5. MAIN FLOWING HAIR & TIARA (Cabelo Violeta Magnífico)
    const mainHairGrad = this.#ctx.createLinearGradient(10, -35, 38, -5);
    mainHairGrad.addColorStop(0, '#7e22ce');
    mainHairGrad.addColorStop(0.5, '#c084fc');
    mainHairGrad.addColorStop(1, '#f472b6');
    this.#ctx.fillStyle = mainHairGrad;

    this.#ctx.beginPath();
    this.#ctx.moveTo(18, -27);
    this.#ctx.bezierCurveTo(12, -38, 32, -35, 36, -24);
    this.#ctx.bezierCurveTo(40, -15, 34, -8, 24, -10 + hairWave1 * 3);
    this.#ctx.bezierCurveTo(15, -16, 12, -22, 18, -27);
    this.#ctx.closePath();
    this.#ctx.fill();

    // Golden Royal Tiara (Tiara Real com Joia Azul)
    this.#ctx.fillStyle = '#facc15'; // Gold
    this.#ctx.beginPath();
    this.#ctx.moveTo(22, -26);
    this.#ctx.lineTo(25, -31);
    this.#ctx.lineTo(28, -26);
    this.#ctx.lineTo(31, -30);
    this.#ctx.lineTo(34, -25);
    this.#ctx.closePath();
    this.#ctx.fill();

    // Sapphire Jewel on Tiara
    this.#ctx.fillStyle = '#38bdf8';
    this.#ctx.beginPath();
    this.#ctx.arc(28, -27, 1.8, 0, Math.PI * 2);
    this.#ctx.fill();

    this.#ctx.restore();
  }

  #drawMagicButterfly() {
    this.#ctx.save();
    this.#ctx.translate(this.#butterfly.x, this.#butterfly.y);

    const flap = Math.abs(Math.sin(this.#butterfly.wingAnim));

    // Glowing Wings
    this.#ctx.shadowBlur = 10;
    this.#ctx.shadowColor = '#f472b6';
    this.#ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';

    // Left Wings
    this.#ctx.save();
    this.#ctx.scale(flap, 1);
    this.#ctx.beginPath();
    this.#ctx.ellipse(-6, -6, 8, 5, -0.4, 0, Math.PI * 2);
    this.#ctx.ellipse(-5, 4, 6, 4, 0.4, 0, Math.PI * 2);
    this.#ctx.fill();
    this.#ctx.restore();

    // Right Wings
    this.#ctx.save();
    this.#ctx.scale(flap, 1);
    this.#ctx.beginPath();
    this.#ctx.ellipse(6, -6, 8, 5, 0.4, 0, Math.PI * 2);
    this.#ctx.ellipse(5, 4, 6, 4, -0.4, 0, Math.PI * 2);
    this.#ctx.fill();
    this.#ctx.restore();

    // Butterfly Body
    this.#ctx.fillStyle = '#ffffff';
    this.#ctx.beginPath();
    this.#ctx.ellipse(0, 0, 1.8, 6, 0, 0, Math.PI * 2);
    this.#ctx.fill();

    this.#ctx.restore();
  }

  #drawObstacle(obs) {
    this.#ctx.save();
    this.#ctx.translate(obs.x, obs.y);

    if (obs.type === 'jelly') {
      // Luminescent Jellyfish
      const pulse = 1 + Math.sin(obs.anim) * 0.1;
      this.#ctx.scale(pulse, 1 / pulse);
      this.#ctx.shadowBlur = 15;
      this.#ctx.shadowColor = '#c084fc';
      this.#ctx.fillStyle = 'rgba(192, 132, 252, 0.85)';
      this.#ctx.beginPath();
      this.#ctx.arc(0, 0, obs.r, Math.PI, Math.PI * 2);
      this.#ctx.fill();

      // Tentacles
      this.#ctx.strokeStyle = 'rgba(216, 180, 254, 0.8)';
      this.#ctx.lineWidth = 1.8;
      for (let i = -2; i <= 2; i++) {
        const tx = i * 4;
        this.#ctx.beginPath();
        this.#ctx.moveTo(tx, 0);
        this.#ctx.lineTo(tx + Math.sin(obs.anim + i) * 6, 18);
        this.#ctx.stroke();
      }
    } else {
      // Spiky Sea Urchin
      this.#ctx.fillStyle = '#4c1d95';
      this.#ctx.beginPath();
      this.#ctx.arc(0, 0, obs.r * 0.7, 0, Math.PI * 2);
      this.#ctx.fill();

      this.#ctx.strokeStyle = '#a855f7';
      this.#ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        this.#ctx.beginPath();
        this.#ctx.moveTo(0, 0);
        this.#ctx.lineTo(Math.cos(a) * obs.r, Math.sin(a) * obs.r);
        this.#ctx.stroke();
      }
    }

    this.#ctx.restore();
  }
}
