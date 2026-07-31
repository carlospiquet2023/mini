/* ===========================================
   MermaidGame — Aventura da Sereia & Borboleta
   Realistic & Elegant Mermaid Swim Adventure
   Canvas 2D with Fluid Physics, Shimmering Tail,
   Flowing Hair, Pearl Collections & High-Def Sprites
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

  // Sprites
  #mermaidSprite = null;
  #mermaidSpriteLoaded = false;
  #butterflySprite = null;
  #butterflySpriteLoaded = false;

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
    this.#loadSprites();
  }

  #loadSprites() {
    // Load Mermaid Sprite and remove white background
    this.#loadTransparentSprite('assets/mermaid_sprite.png', (canvas) => {
      this.#mermaidSprite = canvas;
      this.#mermaidSpriteLoaded = true;
    });

    // Load Butterfly Sprite and remove white background
    this.#loadTransparentSprite('assets/butterfly_sprite.png', (canvas) => {
      this.#butterflySprite = canvas;
      this.#butterflySpriteLoaded = true;
    });
  }

  #loadTransparentSprite(src, callback) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = img.width;
      off.height = img.height;
      const ctx = off.getContext('2d');
      ctx.drawImage(img, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;

        // Chroma key white background to 100% transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 215 && g > 215 && b > 215) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        callback(off);
      } catch (e) {
        callback(img);
      }
    };
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
    const targetBfX = this.#player.x - 30;
    const targetBfY = this.#player.y - 35 + Math.sin(this.#worldTime * 4) * 6;
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

    // Update Obstacles (Jellyfish & Urchins)
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
    oceanGrad.addColorStop(0, '#0369a1');
    oceanGrad.addColorStop(0.3, '#075985');
    oceanGrad.addColorStop(0.7, '#0c4a6e');
    oceanGrad.addColorStop(1, '#082f49');
    this.#ctx.fillStyle = oceanGrad;
    this.#ctx.fillRect(0, 0, this.#width, this.#height);

    // Dynamic Sunbeams (Raios de Sol Submarinos)
    this.#ctx.save();
    this.#ctx.globalCompositeOperation = 'screen';
    for (const r of this.#lightRays) {
      const sway = Math.sin(this.#worldTime * 1.5 + r.x) * 15;
      const rayGrad = this.#ctx.createLinearGradient(r.x, 0, r.x + r.w, this.#height);
      rayGrad.addColorStop(0, `rgba(186, 230, 253, ${r.alpha + 0.05})`);
      rayGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
      this.#ctx.fillStyle = rayGrad;
      this.#ctx.beginPath();
      this.#ctx.moveTo(r.x + sway, 0);
      this.#ctx.lineTo(r.x + r.w + sway, 0);
      this.#ctx.lineTo(r.x + r.w * 2 + sway * 1.5, this.#height);
      this.#ctx.lineTo(r.x + r.w * 0.5 + sway * 1.5, this.#height);
      this.#ctx.closePath();
      this.#ctx.fill();
    }
    this.#ctx.restore();

    // Sandy Ocean Floor with Corals & Kelp (Fundo do Mar com Recifes de Corais)
    const sandGrad = this.#ctx.createLinearGradient(0, this.#height - 55, 0, this.#height);
    sandGrad.addColorStop(0, '#0f766e');
    sandGrad.addColorStop(1, '#115e59');
    this.#ctx.fillStyle = sandGrad;
    this.#ctx.beginPath();
    this.#ctx.moveTo(0, this.#height - 45);
    for (let x = 0; x <= this.#width; x += 15) {
      const y = this.#height - 45 + Math.sin(x * 0.04 + this.#worldTime) * 5;
      this.#ctx.lineTo(x, y);
    }
    this.#ctx.lineTo(this.#width, this.#height);
    this.#ctx.lineTo(0, this.#height);
    this.#ctx.fill();

    // Seaweed & Kelp Forest (Algas Marítimas Ondulantes)
    this.#ctx.save();
    this.#ctx.strokeStyle = '#15803d';
    this.#ctx.lineWidth = 4;
    this.#ctx.lineCap = 'round';
    for (let x = 20; x < this.#width; x += 35) {
      const kelpH = 40 + (x % 3) * 15;
      this.#ctx.beginPath();
      this.#ctx.moveTo(x, this.#height - 35);
      this.#ctx.quadraticCurveTo(
        x + Math.sin(this.#worldTime * 2 + x) * 12,
        this.#height - 35 - kelpH / 2,
        x + Math.cos(this.#worldTime * 2 + x) * 8,
        this.#height - 35 - kelpH
      );
      this.#ctx.stroke();
    }
    this.#ctx.restore();

    // Colorful Coral Reefs (Corais Coloridos no Solo)
    this.#drawCoralReefs();

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

    // REALISTIC BEAUTIFUL MERMAID SPRITE (Sereia Realista)
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

    if (this.#mermaidSpriteLoaded) {
      // Draw Ultra-High-Definition Sprite Image!
      const w = 72;
      const h = 58;
      const bob = Math.sin(this.#worldTime * 5.0) * 3;
      this.#ctx.shadowBlur = 16;
      this.#ctx.shadowColor = '#2dd4bf';
      this.#ctx.drawImage(this.#mermaidSprite, -w / 2, -h / 2 + bob, w, h);
    } else {
      // Vector fallback
      const tailWave = Math.sin(this.#worldTime * 5.5);

      // Tail
      this.#ctx.fillStyle = '#2dd4bf';
      this.#ctx.beginPath();
      this.#ctx.moveTo(10, 5);
      this.#ctx.bezierCurveTo(-15, 15, -35, 18, -55, 10 + tailWave * 5);
      this.#ctx.bezierCurveTo(-42, -5, -25, -10, 10, -5);
      this.#ctx.fill();

      // Torso & Skin
      this.#ctx.fillStyle = '#fff7ed';
      this.#ctx.beginPath();
      this.#ctx.ellipse(10, 0, 12, 9, 0, 0, Math.PI * 2);
      this.#ctx.fill();

      // Head
      this.#ctx.beginPath();
      this.#ctx.ellipse(26, -18, 9, 10.5, 0, 0, Math.PI * 2);
      this.#ctx.fill();
    }

    this.#ctx.restore();
  }

  #drawMagicButterfly() {
    this.#ctx.save();
    this.#ctx.translate(this.#butterfly.x, this.#butterfly.y);

    if (this.#butterflySpriteLoaded) {
      const w = 26;
      const h = 26;
      const flap = 1 + Math.sin(this.#butterfly.wingAnim) * 0.15;
      this.#ctx.scale(1, flap);
      this.#ctx.shadowBlur = 12;
      this.#ctx.shadowColor = '#f472b6';
      this.#ctx.drawImage(this.#butterflySprite, -w / 2, -h / 2, w, h);
    } else {
      const flap = Math.abs(Math.sin(this.#butterfly.wingAnim));
      this.#ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
      this.#ctx.scale(flap, 1);
      this.#ctx.beginPath();
      this.#ctx.ellipse(-6, -6, 8, 5, -0.4, 0, Math.PI * 2);
      this.#ctx.fill();
    }

    this.#ctx.restore();
  }

  #drawObstacle(obs) {
    this.#ctx.save();
    this.#ctx.translate(obs.x, obs.y);

    if (obs.type === 'jelly') {
      const pulse = 1 + Math.sin(obs.anim) * 0.1;
      this.#ctx.scale(pulse, 1 / pulse);
      this.#ctx.shadowBlur = 15;
      this.#ctx.shadowColor = '#c084fc';
      this.#ctx.fillStyle = 'rgba(192, 132, 252, 0.85)';
      this.#ctx.beginPath();
      this.#ctx.arc(0, 0, obs.r, Math.PI, Math.PI * 2);
      this.#ctx.fill();

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

  #drawCoralReefs() {
    this.#ctx.save();
    // Magenta Brain Coral
    this.#ctx.fillStyle = '#ec4899';
    this.#ctx.beginPath();
    this.#ctx.arc(45, this.#height - 35, 14, Math.PI, 0);
    this.#ctx.fill();

    // Cyan Sea Fan Coral
    this.#ctx.fillStyle = '#06b6d4';
    this.#ctx.beginPath();
    this.#ctx.arc(130, this.#height - 32, 18, Math.PI, 0);
    this.#ctx.fill();

    // Golden Anemone Coral
    this.#ctx.fillStyle = '#eab308';
    this.#ctx.beginPath();
    this.#ctx.arc(215, this.#height - 36, 16, Math.PI, 0);
    this.#ctx.fill();

    // Purple Coral Cluster
    this.#ctx.fillStyle = '#a855f7';
    this.#ctx.beginPath();
    this.#ctx.arc(270, this.#height - 30, 12, Math.PI, 0);
    this.#ctx.fill();
    this.#ctx.restore();
  }
}
