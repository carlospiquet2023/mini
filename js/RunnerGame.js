/* ===========================================
   RunnerGame — Super Pulo / Obstacle Runner Game
   Canvas 2D Side-Scroller with Parallax, Physics,
   Obstacles, Coins, Power-ups & Particles
   =========================================== */

export default class RunnerGame {
  #canvas;
  #ctx;
  #callbacks;
  #width = 300;
  #height = 500;
  #isRunning = false;
  #lastTime = 0;
  #animationFrameId = null;
  #shakeAmount = 0;

  // Game World Constants
  #gravity = 1800;
  #jumpForce = -650;
  #groundY = 0;

  // State
  #state = 'PLAYING'; // 'PLAYING', 'GAMEOVER'
  #score = 0;
  #coins = 0;
  #lives = 3;
  #speed = 220;
  #maxSpeed = 450;
  #distance = 0;
  #spawnTimer = 0;
  #nextSpawn = 1.4;
  #coinTimer = 0;
  #starTimer = 0;

  // Player
  #player = {
    x: 50,
    y: 0,
    w: 28,
    h: 42,
    vy: 0,
    grounded: true,
    jumpsLeft: 2,
    invulnerableTimer: 0,
    starTimer: 0,
    animFrame: 0
  };

  // Entities & FX
  #obstacles = [];
  #coinsList = [];
  #powerups = [];
  #particles = [];
  #clouds = [];
  #hills = [];

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

    this.#initBackground();
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
    this.#coins = 0;
    this.#lives = 3;
    this.#speed = 220;
    this.#distance = 0;
    this.#spawnTimer = 0;
    this.#nextSpawn = 1.4;
    this.#coinTimer = 0;
    this.#shakeAmount = 0;

    this.#obstacles = [];
    this.#coinsList = [];
    this.#powerups = [];
    this.#particles = [];

    this.#groundY = this.#height * 0.78;

    this.#player = {
      x: Math.floor(this.#width * 0.18),
      y: this.#groundY - 42,
      w: 28,
      h: 42,
      vy: 0,
      grounded: true,
      jumpsLeft: 2,
      invulnerableTimer: 0,
      starTimer: 0,
      animFrame: 0
    };

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

    this.#groundY = this.#height * 0.78;
    this.#initBackground();
    if (this.#player.grounded) {
      this.#player.y = this.#groundY - this.#player.h;
    }
  }

  onDirection(dir, pressed) {
    if (this.#state !== 'PLAYING') {
      if (pressed) this.restart();
      return;
    }
    if ((dir === 'up' || dir === 'right') && pressed) {
      this.#jump();
    }
  }

  onButtonADown() {
    if (this.#state !== 'PLAYING') {
      this.restart();
      return;
    }
    this.#jump();
  }
  onButtonAUp() {}

  onButtonBDown() {
    if (this.#state !== 'PLAYING') {
      this.restart();
      return;
    }
    this.#jump();
  }
  onButtonBUp() {}

  #jump() {
    if (this.#player.jumpsLeft > 0) {
      this.#player.vy = this.#jumpForce;
      this.#player.grounded = false;
      this.#player.jumpsLeft--;

      // Dust particles
      for (let i = 0; i < 8; i++) {
        this.#particles.push({
          x: this.#player.x + this.#player.w / 2,
          y: this.#player.y + this.#player.h,
          vx: (Math.random() - 0.5) * 60,
          vy: -Math.random() * 40,
          color: '#ffffff',
          life: 0.3,
          maxLife: 0.3,
          r: 2 + Math.random() * 2
        });
      }
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

  #initBackground() {
    this.#clouds = [];
    for (let i = 0; i < 5; i++) {
      this.#clouds.push({
        x: Math.random() * this.#width,
        y: 15 + Math.random() * (this.#height * 0.3),
        w: 40 + Math.random() * 30,
        h: 20 + Math.random() * 10,
        speed: 15 + Math.random() * 20
      });
    }

    this.#hills = [];
    for (let i = 0; i < 4; i++) {
      this.#hills.push({
        x: i * (this.#width / 2),
        w: this.#width * 0.6,
        h: 40 + Math.random() * 30,
        speed: 50
      });
    }
  }

  #update(dt) {
    if (this.#shakeAmount > 0) {
      this.#shakeAmount = Math.max(0, this.#shakeAmount - dt * 30);
    }

    if (this.#state === 'GAMEOVER') return;

    // Acceleration
    this.#speed = Math.min(this.#maxSpeed, this.#speed + dt * 4);
    this.#distance += this.#speed * dt;
    this.#score = Math.floor(this.#distance / 10) + this.#coins * 10;
    if (this.#callbacks.onScoreChange) this.#callbacks.onScoreChange(this.#score);

    // Player Timers & Anim
    this.#player.animFrame += dt * 15;
    if (this.#player.invulnerableTimer > 0) {
      this.#player.invulnerableTimer -= dt;
    }
    if (this.#player.starTimer > 0) {
      this.#player.starTimer -= dt;
    }

    // Player Gravity & Jump Physics
    this.#player.vy += this.#gravity * dt;
    this.#player.y += this.#player.vy * dt;

    if (this.#player.y >= this.#groundY - this.#player.h) {
      this.#player.y = this.#groundY - this.#player.h;
      this.#player.vy = 0;
      this.#player.grounded = true;
      this.#player.jumpsLeft = 2; // Restore double jump
    }

    // Update Parallax Background
    for (const c of this.#clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.w < 0) c.x = this.#width + Math.random() * 30;
    }
    for (const h of this.#hills) {
      h.x -= (this.#speed * 0.3) * dt;
      if (h.x + h.w < 0) h.x = this.#width + Math.random() * 20;
    }

    // Spawn Obstacles
    this.#spawnTimer += dt;
    if (this.#spawnTimer >= this.#nextSpawn) {
      this.#spawnTimer = 0;
      this.#nextSpawn = Math.max(0.9, 1.8 - (this.#speed / 600));
      this.#spawnObstacle();
    }

    // Spawn Coins
    this.#coinTimer += dt;
    if (this.#coinTimer >= 1.2) {
      this.#coinTimer = 0;
      this.#spawnCoin();
    }

    // Update Obstacles
    for (let i = this.#obstacles.length - 1; i >= 0; i--) {
      const obs = this.#obstacles[i];
      obs.x -= this.#speed * dt;
      if (obs.x + obs.w < -20) {
        this.#obstacles.splice(i, 1);
      }
    }

    // Update Coins
    for (let i = this.#coinsList.length - 1; i >= 0; i--) {
      const coin = this.#coinsList[i];
      coin.x -= this.#speed * dt;
      coin.anim += dt * 8;
      if (coin.x < -20) {
        this.#coinsList.splice(i, 1);
      }
    }

    // Update Powerups
    for (let i = this.#powerups.length - 1; i >= 0; i--) {
      const p = this.#powerups[i];
      p.x -= this.#speed * dt;
      if (p.x < -20) {
        this.#powerups.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const p = this.#particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.#particles.splice(i, 1);
      }
    }

    // Collisions
    this.#checkCollisions();
  }

  #spawnObstacle() {
    const rnd = Math.random();
    let type = 'spike';
    let w = 24, h = 28, y = this.#groundY - 28;

    if (rnd > 0.6) {
      type = 'crate';
      w = 30; h = 30;
      y = this.#groundY - 30;
    } else if (rnd > 0.35) {
      type = 'highBlock';
      w = 40; h = 20;
      y = this.#groundY - 65; // Floating block!
    }

    this.#obstacles.push({ type, x: this.#width + 30, y, w, h });
  }

  #spawnCoin() {
    if (Math.random() < 0.6) {
      const count = Math.floor(1 + Math.random() * 3);
      const isHigh = Math.random() < 0.5;
      const startY = isHigh ? this.#groundY - 70 : this.#groundY - 35;

      for (let i = 0; i < count; i++) {
        this.#coinsList.push({
          x: this.#width + 30 + i * 22,
          y: startY,
          r: 7,
          anim: Math.random() * Math.PI
        });
      }
    } else if (Math.random() < 0.15 && this.#powerups.length === 0) {
      // Star Powerup
      this.#powerups.push({
        x: this.#width + 30,
        y: this.#groundY - 60,
        r: 10,
        type: 'star'
      });
    }
  }

  #checkCollisions() {
    const px = this.#player.x + 4;
    const py = this.#player.y + 4;
    const pw = this.#player.w - 8;
    const ph = this.#player.h - 8;

    // Player vs Coins
    for (let i = this.#coinsList.length - 1; i >= 0; i--) {
      const c = this.#coinsList[i];
      if (Math.abs(px + pw / 2 - c.x) < pw / 2 + c.r && Math.abs(py + ph / 2 - c.y) < ph / 2 + c.r) {
        this.#coins++;
        // Sparkles FX
        for (let k = 0; k < 10; k++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 60;
          this.#particles.push({
            x: c.x, y: c.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: '#facc15',
            life: 0.3, maxLife: 0.3, r: 2
          });
        }
        this.#coinsList.splice(i, 1);
      }
    }

    // Player vs Powerups
    for (let i = this.#powerups.length - 1; i >= 0; i--) {
      const p = this.#powerups[i];
      if (Math.abs(px + pw / 2 - p.x) < pw / 2 + p.r && Math.abs(py + ph / 2 - p.y) < ph / 2 + p.r) {
        if (p.type === 'star') {
          this.#player.starTimer = 6.0;
          this.#shakeAmount = 5;
        }
        this.#powerups.splice(i, 1);
      }
    }

    // Player vs Obstacles
    if (this.#player.invulnerableTimer <= 0 && this.#player.starTimer <= 0) {
      for (let i = this.#obstacles.length - 1; i >= 0; i--) {
        const obs = this.#obstacles[i];
        if (px < obs.x + obs.w && px + pw > obs.x && py < obs.y + obs.h && py + ph > obs.y) {
          this.#lives--;
          this.#shakeAmount = 15;
          this.#player.invulnerableTimer = 1.5;

          // Impact explosion particles
          for (let k = 0; k < 15; k++) {
            this.#particles.push({
              x: obs.x + obs.w / 2,
              y: obs.y + obs.h / 2,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              color: '#ef4444',
              life: 0.4, maxLife: 0.4, r: 3
            });
          }

          if (this.#lives <= 0) {
            this.#state = 'GAMEOVER';
            if (this.#callbacks.onGameOver) this.#callbacks.onGameOver(this.#score);
          }
          break;
        }
      }
    }
  }

  #draw() {
    this.#ctx.save();

    // Screen Shake
    if (this.#shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * this.#shakeAmount;
      const sy = (Math.random() - 0.5) * this.#shakeAmount;
      this.#ctx.translate(sx, sy);
    }

    // Sky Gradient
    const skyGrad = this.#ctx.createLinearGradient(0, 0, 0, this.#groundY);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.6, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    this.#ctx.fillStyle = skyGrad;
    this.#ctx.fillRect(0, 0, this.#width, this.#groundY);

    // Sun / Daylight Glow
    this.#ctx.fillStyle = 'rgba(255, 253, 231, 0.4)';
    this.#ctx.beginPath();
    this.#ctx.arc(this.#width * 0.85, 45, 30, 0, Math.PI * 2);
    this.#ctx.fill();

    // Clouds
    this.#ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const c of this.#clouds) {
      this.#ctx.beginPath();
      this.#ctx.roundRect(c.x, c.y, c.w, c.h, 10);
      this.#ctx.fill();
    }

    // Background Hills (Parallax)
    this.#ctx.fillStyle = '#0284c7';
    this.#ctx.globalAlpha = 0.35;
    for (const h of this.#hills) {
      this.#ctx.beginPath();
      this.#ctx.arc(h.x + h.w / 2, this.#groundY, h.w / 2, Math.PI, 0);
      this.#ctx.fill();
    }
    this.#ctx.globalAlpha = 1.0;

    // Ground Layer (Grass top + Earth body)
    const earthGrad = this.#ctx.createLinearGradient(0, this.#groundY, 0, this.#height);
    earthGrad.addColorStop(0, '#15803d');
    earthGrad.addColorStop(0.12, '#166534');
    earthGrad.addColorStop(0.15, '#78350f');
    earthGrad.addColorStop(1, '#451a03');
    this.#ctx.fillStyle = earthGrad;
    this.#ctx.fillRect(0, this.#groundY, this.#width, this.#height - this.#groundY);

    // Grass Top Highlight Line
    this.#ctx.fillStyle = '#4ade80';
    this.#ctx.fillRect(0, this.#groundY, this.#width, 3);

    // Coins
    for (const c of this.#coinsList) {
      const scaleX = Math.abs(Math.sin(c.anim));
      this.#ctx.save();
      this.#ctx.translate(c.x, c.y);
      this.#ctx.scale(scaleX, 1);
      this.#ctx.fillStyle = '#facc15';
      this.#ctx.strokeStyle = '#ca8a04';
      this.#ctx.lineWidth = 1.5;
      this.#ctx.shadowBlur = 6;
      this.#ctx.shadowColor = '#facc15';
      this.#ctx.beginPath();
      this.#ctx.arc(0, 0, c.r, 0, Math.PI * 2);
      this.#ctx.fill();
      this.#ctx.stroke();
      this.#ctx.restore();
    }

    // Powerups (Star)
    for (const p of this.#powerups) {
      this.#ctx.save();
      this.#ctx.translate(p.x, p.y);
      this.#ctx.fillStyle = '#facc15';
      this.#ctx.shadowBlur = 10;
      this.#ctx.shadowColor = '#facc15';
      this.#ctx.font = '16px Fredoka, sans-serif';
      this.#ctx.textAlign = 'center';
      this.#ctx.textBaseline = 'middle';
      this.#ctx.fillText('⭐', 0, 0);
      this.#ctx.restore();
    }

    // Obstacles
    for (const obs of this.#obstacles) {
      this.#ctx.save();
      if (obs.type === 'spike') {
        // Metallic Spikes
        this.#ctx.fillStyle = '#64748b';
        this.#ctx.strokeStyle = '#ef4444';
        this.#ctx.lineWidth = 1.5;
        this.#ctx.beginPath();
        this.#ctx.moveTo(obs.x, obs.y + obs.h);
        this.#ctx.lineTo(obs.x + obs.w / 2, obs.y);
        this.#ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
        this.#ctx.closePath();
        this.#ctx.fill();
        this.#ctx.stroke();
      } else if (obs.type === 'crate') {
        // Wooden Crate
        this.#ctx.fillStyle = '#b45309';
        this.#ctx.strokeStyle = '#78350f';
        this.#ctx.lineWidth = 2;
        this.#ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        this.#ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        // Inner Cross
        this.#ctx.beginPath();
        this.#ctx.moveTo(obs.x + 2, obs.y + 2);
        this.#ctx.lineTo(obs.x + obs.w - 2, obs.y + obs.h - 2);
        this.#ctx.moveTo(obs.x + obs.w - 2, obs.y + 2);
        this.#ctx.lineTo(obs.x + 2, obs.y + obs.h - 2);
        this.#ctx.stroke();
      } else if (obs.type === 'highBlock') {
        // Floating Brick Block
        this.#ctx.fillStyle = '#0284c7';
        this.#ctx.strokeStyle = '#38bdf8';
        this.#ctx.lineWidth = 2;
        this.#ctx.shadowBlur = 8;
        this.#ctx.shadowColor = '#38bdf8';
        this.#ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        this.#ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }
      this.#ctx.restore();
    }

    // Particles
    for (const p of this.#particles) {
      this.#ctx.save();
      this.#ctx.globalAlpha = p.life / p.maxLife;
      this.#ctx.fillStyle = p.color;
      this.#ctx.beginPath();
      this.#ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.#ctx.fill();
      this.#ctx.restore();
    }

    // Player Shadow
    this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    this.#ctx.beginPath();
    this.#ctx.ellipse(this.#player.x + this.#player.w / 2, this.#groundY - 2, this.#player.w / 2, 4, 0, 0, Math.PI * 2);
    this.#ctx.fill();

    // Player Render (Runner Boy)
    if (this.#player.invulnerableTimer <= 0 || Math.floor(performance.now() / 100) % 2 === 0) {
      this.#ctx.save();
      this.#ctx.translate(this.#player.x, this.#player.y);

      // Star Powerup Glow
      if (this.#player.starTimer > 0) {
        this.#ctx.shadowBlur = 15;
        this.#ctx.shadowColor = '#facc15';
      }

      // Body (Red shirt)
      this.#ctx.fillStyle = '#ef4444';
      this.#ctx.fillRect(4, 14, 20, 16);

      // Head (Skin & Hair)
      this.#ctx.fillStyle = '#fdba74';
      this.#ctx.beginPath();
      this.#ctx.arc(14, 10, 9, 0, Math.PI * 2);
      this.#ctx.fill();

      // Hair (Brown)
      this.#ctx.fillStyle = '#78350f';
      this.#ctx.beginPath();
      this.#ctx.arc(14, 7, 9, Math.PI, Math.PI * 2);
      this.#ctx.fill();

      // Eye
      this.#ctx.fillStyle = '#000000';
      this.#ctx.beginPath();
      this.#ctx.arc(17, 9, 1.5, 0, Math.PI * 2);
      this.#ctx.fill();

      // Legs Animation
      this.#ctx.fillStyle = '#1d4ed8'; // Blue pants
      if (!this.#player.grounded) {
        // Jump pose
        this.#ctx.fillRect(4, 28, 8, 12);
        this.#ctx.fillRect(16, 26, 8, 10);
      } else {
        // Running leg animation
        const legOff = Math.sin(this.#player.animFrame) * 6;
        this.#ctx.fillRect(5 + legOff, 28, 6, 12);
        this.#ctx.fillRect(17 - legOff, 28, 6, 12);
      }

      this.#ctx.restore();
    }

    // Top UI Bar (Lives & Coins)
    this.#ctx.save();
    this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.#ctx.fillRect(0, 0, this.#width, 24);

    this.#ctx.font = 'bold 12px Fredoka, sans-serif';
    this.#ctx.textBaseline = 'middle';

    // Lives (Hearts)
    let hearts = '';
    for (let i = 0; i < 3; i++) {
      hearts += i < this.#lives ? '❤️ ' : '💔 ';
    }
    this.#ctx.fillStyle = '#ffffff';
    this.#ctx.fillText(hearts, 8, 12);

    // Coins Collected
    this.#ctx.fillStyle = '#facc15';
    this.#ctx.textAlign = 'right';
    this.#ctx.fillText(`🟡 ${this.#coins}`, this.#width - 8, 12);
    this.#ctx.restore();

    // Game Over Overlay
    if (this.#state === 'GAMEOVER') {
      this.#ctx.save();
      this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      this.#ctx.fillRect(0, 0, this.#width, this.#height);

      this.#ctx.fillStyle = '#ffffff';
      this.#ctx.font = 'bold 28px Fredoka, sans-serif';
      this.#ctx.textAlign = 'center';
      this.#ctx.shadowColor = '#ef4444';
      this.#ctx.shadowBlur = 12;
      this.#ctx.fillText('GAME OVER', this.#width / 2, this.#height * 0.4);

      this.#ctx.font = 'bold 16px Fredoka, sans-serif';
      this.#ctx.shadowColor = '#000000';
      this.#ctx.shadowBlur = 4;
      this.#ctx.fillText(`Pontuação: ${this.#score}`, this.#width / 2, this.#height * 0.52);
      this.#ctx.fillText(`Moedas: 🟡 ${this.#coins}`, this.#width / 2, this.#height * 0.59);

      this.#ctx.fillStyle = '#facc15';
      this.#ctx.font = '14px Fredoka, sans-serif';
      this.#ctx.fillText('Pressione qualquer botão para jogar novamente', this.#width / 2, this.#height * 0.72);
      this.#ctx.restore();
    }

    this.#ctx.restore();
  }
}
