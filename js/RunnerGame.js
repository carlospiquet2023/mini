/* ===========================================
   RunnerGame — Super Pulo / Mario-Inspired Runner
   Canvas 2D Side-Scroller with Pitfall Gaps,
   Stompassable Enemies, Mystery ? Blocks,
   Hero Cap Character & Parallax World
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

  // Physics & World
  #gravity = 1800;
  #jumpForce = -650;
  #groundY = 0;

  // State
  #state = 'PLAYING'; // 'PLAYING', 'GAMEOVER'
  #score = 0;
  #coins = 0;
  #lives = 3;
  #speed = 220;
  #maxSpeed = 460;
  #distance = 0;
  #spawnTimer = 0;
  #nextSpawn = 1.3;
  #coinTimer = 0;

  // Player (Hero Encanador / Super Runner)
  #player = {
    x: 50,
    y: 0,
    w: 30,
    h: 44,
    vy: 0,
    grounded: true,
    jumpsLeft: 2,
    invulnerableTimer: 0,
    starTimer: 0,
    animFrame: 0,
    isFallingInGap: false
  };

  // World Entities
  #gaps = [];        // Buracos no chão
  #enemies = [];     // Cogumelos Selvagens e Tarta-Espinhos
  #obstacles = [];   // Caixas e Blocos ?
  #coinsList = [];   // Moedas de ouro
  #powerups = [];    // Estrelas ⭐
  #particles = [];   // Efeitos visuais
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
    this.#nextSpawn = 1.3;
    this.#coinTimer = 0;
    this.#shakeAmount = 0;

    this.#gaps = [];
    this.#enemies = [];
    this.#obstacles = [];
    this.#coinsList = [];
    this.#powerups = [];
    this.#particles = [];

    this.#groundY = this.#height * 0.78;

    this.#player = {
      x: Math.floor(this.#width * 0.18),
      y: this.#groundY - 44,
      w: 30,
      h: 44,
      vy: 0,
      grounded: true,
      jumpsLeft: 2,
      invulnerableTimer: 0,
      starTimer: 0,
      animFrame: 0,
      isFallingInGap: false
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
    if (this.#player.grounded && !this.#player.isFallingInGap) {
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
    if (this.#player.isFallingInGap) return;

    if (this.#player.jumpsLeft > 0) {
      this.#player.vy = this.#jumpForce;
      this.#player.grounded = false;
      this.#player.jumpsLeft--;

      // Jump Dust FX
      for (let i = 0; i < 8; i++) {
        this.#particles.push({
          x: this.#player.x + this.#player.w / 2,
          y: this.#player.y + this.#player.h,
          vx: (Math.random() - 0.5) * 70,
          vy: -Math.random() * 50,
          color: '#ffffff',
          life: 0.35, maxLife: 0.35, r: 2.5
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
        w: 45 + Math.random() * 35,
        h: 22 + Math.random() * 12,
        speed: 12 + Math.random() * 18
      });
    }

    this.#hills = [];
    for (let i = 0; i < 4; i++) {
      this.#hills.push({
        x: i * (this.#width / 2),
        w: this.#width * 0.65,
        h: 50 + Math.random() * 35,
        speed: 40
      });
    }
  }

  #update(dt) {
    if (this.#shakeAmount > 0) {
      this.#shakeAmount = Math.max(0, this.#shakeAmount - dt * 30);
    }

    if (this.#state === 'GAMEOVER') return;

    // Speed Acceleration & Score
    this.#speed = Math.min(this.#maxSpeed, this.#speed + dt * 4);
    this.#distance += this.#speed * dt;
    this.#score = Math.floor(this.#distance / 10) + this.#coins * 10;
    if (this.#callbacks.onScoreChange) this.#callbacks.onScoreChange(this.#score);

    // Timers & Anim
    this.#player.animFrame += dt * 16;
    if (this.#player.invulnerableTimer > 0) this.#player.invulnerableTimer -= dt;
    if (this.#player.starTimer > 0) this.#player.starTimer -= dt;

    // Check if player is over a GAP (Buraco)
    const pxCenter = this.#player.x + this.#player.w / 2;
    let overGap = false;
    for (const g of this.#gaps) {
      if (pxCenter > g.x && pxCenter < g.x + g.w) {
        overGap = true;
        break;
      }
    }

    // Player Gravity & Jump Physics
    this.#player.vy += this.#gravity * dt;
    this.#player.y += this.#player.vy * dt;

    if (overGap && this.#player.y + this.#player.h >= this.#groundY - 2) {
      // Player falls into PITFALL GAP!
      this.#player.isFallingInGap = true;
      this.#player.grounded = false;
    }

    if (!this.#player.isFallingInGap) {
      if (this.#player.y >= this.#groundY - this.#player.h) {
        this.#player.y = this.#groundY - this.#player.h;
        this.#player.vy = 0;
        this.#player.grounded = true;
        this.#player.jumpsLeft = 2; // Restore double jump
      }
    } else {
      // If fallen below screen in gap: take damage & respawn onto next solid ground!
      if (this.#player.y > this.#height + 50) {
        this.#lives--;
        this.#shakeAmount = 20;

        if (this.#lives <= 0) {
          this.#state = 'GAMEOVER';
          if (this.#callbacks.onGameOver) this.#callbacks.onGameOver(this.#score);
        } else {
          // Respawn player
          this.#player.isFallingInGap = false;
          this.#player.y = this.#groundY - this.#player.h;
          this.#player.vy = 0;
          this.#player.grounded = true;
          this.#player.invulnerableTimer = 1.8;
          this.#player.jumpsLeft = 2;
        }
      }
    }

    // Parallax Background
    for (const c of this.#clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.w < 0) c.x = this.#width + Math.random() * 30;
    }
    for (const h of this.#hills) {
      h.x -= (this.#speed * 0.3) * dt;
      if (h.x + h.w < 0) h.x = this.#width + Math.random() * 20;
    }

    // Spawn Spawner Logic
    this.#spawnTimer += dt;
    if (this.#spawnTimer >= this.#nextSpawn) {
      this.#spawnTimer = 0;
      this.#nextSpawn = Math.max(0.85, 1.7 - (this.#speed / 600));
      this.#spawnWorldElement();
    }

    // Spawn Coins
    this.#coinTimer += dt;
    if (this.#coinTimer >= 1.2) {
      this.#coinTimer = 0;
      this.#spawnCoinGroup();
    }

    // Update Gaps (Buracos)
    for (let i = this.#gaps.length - 1; i >= 0; i--) {
      const g = this.#gaps[i];
      g.x -= this.#speed * dt;
      if (g.x + g.w < -40) this.#gaps.splice(i, 1);
    }

    // Update Enemies (Cogumelos & Tartarugas)
    for (let i = this.#enemies.length - 1; i >= 0; i--) {
      const e = this.#enemies[i];
      e.x -= (this.#speed + (e.walkSpeed || 30)) * dt;
      e.anim += dt * 8;
      if (e.x + e.w < -40) this.#enemies.splice(i, 1);
    }

    // Update Obstacles (? Blocks & Crates)
    for (let i = this.#obstacles.length - 1; i >= 0; i--) {
      const obs = this.#obstacles[i];
      obs.x -= this.#speed * dt;
      if (obs.hitTimer > 0) obs.hitTimer -= dt;
      if (obs.x + obs.w < -40) this.#obstacles.splice(i, 1);
    }

    // Update Coins
    for (let i = this.#coinsList.length - 1; i >= 0; i--) {
      const coin = this.#coinsList[i];
      coin.x -= this.#speed * dt;
      coin.anim += dt * 8;
      if (coin.x < -30) this.#coinsList.splice(i, 1);
    }

    // Update Powerups (Stars)
    for (let i = this.#powerups.length - 1; i >= 0; i--) {
      const p = this.#powerups[i];
      p.x -= this.#speed * dt;
      if (p.x < -30) this.#powerups.splice(i, 1);
    }

    // Update Particles
    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const p = this.#particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.#particles.splice(i, 1);
    }

    // Collision Logic
    this.#checkCollisions();
  }

  #spawnWorldElement() {
    const rnd = Math.random();

    if (rnd < 0.3) {
      // Spawn PITFALL GAP (Buraco no chão)
      const gapW = 45 + Math.random() * 25;
      this.#gaps.push({ x: this.#width + 40, w: gapW });
    } else if (rnd < 0.65) {
      // Spawn ENEMY (Cogumelo Selvagem ou Tarta-Espinho)
      const isShroom = Math.random() < 0.55;
      if (isShroom) {
        // Cogumelo Selvagem (Monster Shroom)
        this.#enemies.push({
          type: 'shroom',
          x: this.#width + 40,
          y: this.#groundY - 26,
          w: 26, h: 26,
          walkSpeed: 25,
          anim: 0
        });
      } else {
        // Tarta-Espinho (Spiky Shell)
        this.#enemies.push({
          type: 'turtle',
          x: this.#width + 40,
          y: this.#groundY - 24,
          w: 28, h: 24,
          walkSpeed: 35,
          anim: 0
        });
      }
    } else {
      // Spawn OBSTACLE (? Block or Wooden Crate)
      const isQuestion = Math.random() < 0.5;
      if (isQuestion) {
        this.#obstacles.push({
          type: 'question',
          x: this.#width + 40,
          y: this.#groundY - 65, // Floating ? block
          w: 28, h: 28,
          used: false,
          hitTimer: 0
        });
      } else {
        this.#obstacles.push({
          type: 'crate',
          x: this.#width + 40,
          y: this.#groundY - 30,
          w: 30, h: 30,
          used: false,
          hitTimer: 0
        });
      }
    }
  }

  #spawnCoinGroup() {
    if (Math.random() < 0.55) {
      const count = Math.floor(1 + Math.random() * 3);
      const isHigh = Math.random() < 0.5;
      const startY = isHigh ? this.#groundY - 75 : this.#groundY - 38;

      for (let i = 0; i < count; i++) {
        this.#coinsList.push({
          x: this.#width + 40 + i * 22,
          y: startY,
          r: 7,
          anim: Math.random() * Math.PI
        });
      }
    } else if (Math.random() < 0.15 && this.#powerups.length === 0) {
      // Star Powerup ⭐
      this.#powerups.push({
        x: this.#width + 40,
        y: this.#groundY - 65,
        r: 10,
        type: 'star'
      });
    }
  }

  #checkCollisions() {
    if (this.#player.isFallingInGap) return;

    const px = this.#player.x + 3;
    const py = this.#player.y + 3;
    const pw = this.#player.w - 6;
    const ph = this.#player.h - 6;

    // Player vs Coins
    for (let i = this.#coinsList.length - 1; i >= 0; i--) {
      const c = this.#coinsList[i];
      if (Math.abs(px + pw / 2 - c.x) < pw / 2 + c.r && Math.abs(py + ph / 2 - c.y) < ph / 2 + c.r) {
        this.#coins++;
        for (let k = 0; k < 10; k++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 60;
          this.#particles.push({
            x: c.x, y: c.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: '#facc15', life: 0.3, maxLife: 0.3, r: 2
          });
        }
        this.#coinsList.splice(i, 1);
      }
    }

    // Player vs Powerups (⭐)
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

    // Player vs Enemies (STOMP MECHANIC!)
    for (let i = this.#enemies.length - 1; i >= 0; i--) {
      const e = this.#enemies[i];
      if (px < e.x + e.w && px + pw > e.x && py < e.y + e.h && py + ph > e.y) {
        // Star Invincibility: Destroy enemy instantly!
        if (this.#player.starTimer > 0) {
          this.#createSquishParticles(e.x + e.w / 2, e.y + e.h / 2, '#facc15');
          this.#enemies.splice(i, 1);
          this.#score += 50;
          continue;
        }

        // STOMP CHECK: Did player land from ABOVE on enemy?
        const isStomping = (this.#player.vy > 0) && (py + ph - this.#player.vy * 0.1 <= e.y + 12);
        if (isStomping) {
          // STOMP SUCCESS!
          this.#player.vy = -380; // Bounce upward!
          this.#player.jumpsLeft = 1;
          this.#createSquishParticles(e.x + e.w / 2, e.y + e.h / 2, e.type === 'shroom' ? '#78350f' : '#22c55e');
          this.#enemies.splice(i, 1);
          this.#score += 50;
          this.#shakeAmount = 6;
        } else if (this.#player.invulnerableTimer <= 0) {
          // HIT BY ENEMY FROM SIDE!
          this.#lives--;
          this.#shakeAmount = 15;
          this.#player.invulnerableTimer = 1.6;

          if (this.#lives <= 0) {
            this.#state = 'GAMEOVER';
            if (this.#callbacks.onGameOver) this.#callbacks.onGameOver(this.#score);
          }
        }
      }
    }

    // Player vs Obstacles (? Blocks & Crates)
    for (let i = this.#obstacles.length - 1; i >= 0; i--) {
      const obs = this.#obstacles[i];
      if (px < obs.x + obs.w && px + pw > obs.x && py < obs.y + obs.h && py + ph > obs.y) {
        if (obs.type === 'question' && !obs.used) {
          // Hit ? Block from below!
          if (this.#player.vy < 0 && py >= obs.y + obs.h - 10) {
            obs.used = true;
            obs.hitTimer = 0.2;
            this.#coins++;
            this.#score += 20;
            // Pop out coin FX
            for (let k = 0; k < 12; k++) {
              this.#particles.push({
                x: obs.x + obs.w / 2, y: obs.y,
                vx: (Math.random() - 0.5) * 80, vy: -120 - Math.random() * 80,
                color: '#facc15', life: 0.4, maxLife: 0.4, r: 2.5
              });
            }
            this.#player.vy = 50; // Bounce back down
            continue;
          }
        }

        // Side or Top Collision with Crate/Block
        if (this.#player.starTimer > 0) {
          // Break block with star powerup
          this.#createSquishParticles(obs.x + obs.w / 2, obs.y + obs.h / 2, '#b45309');
          this.#obstacles.splice(i, 1);
        } else if (this.#player.invulnerableTimer <= 0) {
          // Land on top or hit side
          if (this.#player.vy > 0 && py + ph - this.#player.vy * 0.1 <= obs.y + 8) {
            // Land on top of block!
            this.#player.y = obs.y - this.#player.h;
            this.#player.vy = 0;
            this.#player.grounded = true;
            this.#player.jumpsLeft = 2;
          } else {
            // Hit obstacle side!
            this.#lives--;
            this.#shakeAmount = 15;
            this.#player.invulnerableTimer = 1.5;
            if (this.#lives <= 0) {
              this.#state = 'GAMEOVER';
              if (this.#callbacks.onGameOver) this.#callbacks.onGameOver(this.#score);
            }
          }
        }
      }
    }
  }

  #createSquishParticles(x, y, color) {
    for (let k = 0; k < 15; k++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 50 + Math.random() * 100;
      this.#particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        life: 0.4, maxLife: 0.4, r: 3
      });
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
    skyGrad.addColorStop(0.65, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    this.#ctx.fillStyle = skyGrad;
    this.#ctx.fillRect(0, 0, this.#width, this.#groundY);

    // Sun / Daylight Glow
    this.#ctx.fillStyle = 'rgba(255, 253, 231, 0.45)';
    this.#ctx.beginPath();
    this.#ctx.arc(this.#width * 0.82, 45, 32, 0, Math.PI * 2);
    this.#ctx.fill();

    // Clouds
    this.#ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    for (const c of this.#clouds) {
      this.#ctx.beginPath();
      this.#ctx.roundRect(c.x, c.y, c.w, c.h, 10);
      this.#ctx.fill();
    }

    // Background Mountain Hills (Parallax)
    this.#ctx.fillStyle = '#0369a1';
    this.#ctx.globalAlpha = 0.35;
    for (const h of this.#hills) {
      this.#ctx.beginPath();
      this.#ctx.arc(h.x + h.w / 2, this.#groundY, h.w / 2, Math.PI, 0);
      this.#ctx.fill();
    }
    this.#ctx.globalAlpha = 1.0;

    // DRAW GROUND & GAPS (Buracos)
    this.#drawGroundAndGaps();

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

    // Powerups (⭐ Star)
    for (const p of this.#powerups) {
      this.#ctx.save();
      this.#ctx.translate(p.x, p.y);
      this.#ctx.fillStyle = '#facc15';
      this.#ctx.shadowBlur = 12;
      this.#ctx.shadowColor = '#facc15';
      this.#ctx.font = '16px Fredoka, sans-serif';
      this.#ctx.textAlign = 'center';
      this.#ctx.textBaseline = 'middle';
      this.#ctx.fillText('⭐', 0, 0);
      this.#ctx.restore();
    }

    // Obstacles (? Blocks & Crates)
    for (const obs of this.#obstacles) {
      this.#ctx.save();
      const offsetY = obs.hitTimer > 0 ? -4 : 0;
      this.#ctx.translate(obs.x, obs.y + offsetY);

      if (obs.type === 'question') {
        // Question ? Block
        this.#ctx.fillStyle = obs.used ? '#78350f' : '#f59e0b';
        this.#ctx.strokeStyle = obs.used ? '#451a03' : '#b45309';
        this.#ctx.lineWidth = 2;
        this.#ctx.shadowBlur = obs.used ? 0 : 8;
        this.#ctx.shadowColor = '#f59e0b';
        this.#ctx.fillRect(0, 0, obs.w, obs.h);
        this.#ctx.strokeRect(0, 0, obs.w, obs.h);

        // Bold ? Mark
        this.#ctx.fillStyle = obs.used ? '#a16207' : '#ffffff';
        this.#ctx.font = 'bold 16px Fredoka, sans-serif';
        this.#ctx.textAlign = 'center';
        this.#ctx.textBaseline = 'middle';
        this.#ctx.fillText(obs.used ? '•' : '?', obs.w / 2, obs.h / 2);
      } else if (obs.type === 'crate') {
        // Wooden Crate
        this.#ctx.fillStyle = '#b45309';
        this.#ctx.strokeStyle = '#78350f';
        this.#ctx.lineWidth = 2;
        this.#ctx.fillRect(0, 0, obs.w, obs.h);
        this.#ctx.strokeRect(0, 0, obs.w, obs.h);
        this.#ctx.beginPath();
        this.#ctx.moveTo(2, 2);
        this.#ctx.lineTo(obs.w - 2, obs.h - 2);
        this.#ctx.moveTo(obs.w - 2, 2);
        this.#ctx.lineTo(2, obs.h - 2);
        this.#ctx.stroke();
      }
      this.#ctx.restore();
    }

    // Enemies (Cogumelo Selvagem & Tarta-Espinho)
    for (const e of this.#enemies) {
      this.#drawEnemy(e);
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

    // Player Shadow (only when on solid ground)
    if (this.#player.grounded && !this.#player.isFallingInGap) {
      this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      this.#ctx.beginPath();
      this.#ctx.ellipse(this.#player.x + this.#player.w / 2, this.#groundY - 2, this.#player.w / 2, 4, 0, 0, Math.PI * 2);
      this.#ctx.fill();
    }

    // HERO CHARACTER (Encanador Plumber Hero)
    if (this.#player.invulnerableTimer <= 0 || Math.floor(performance.now() / 100) % 2 === 0) {
      this.#drawHeroCharacter();
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

    // Coins
    this.#ctx.fillStyle = '#facc15';
    this.#ctx.textAlign = 'right';
    this.#ctx.fillText(`🟡 ${this.#coins}`, this.#width - 8, 12);
    this.#ctx.restore();

    // Game Over Overlay
    if (this.#state === 'GAMEOVER') {
      this.#ctx.save();
      this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
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
      this.#ctx.fillText(`Distância: ${this.#score}m`, this.#width / 2, this.#height * 0.52);
      this.#ctx.fillText(`Moedas: 🟡 ${this.#coins}`, this.#width / 2, this.#height * 0.59);

      this.#ctx.fillStyle = '#facc15';
      this.#ctx.font = '14px Fredoka, sans-serif';
      this.#ctx.fillText('Pressione qualquer botão para tentar novamente', this.#width / 2, this.#height * 0.72);
      this.#ctx.restore();
    }

    this.#ctx.restore();
  }

  #drawGroundAndGaps() {
    // Sort gaps horizontally
    const sortedGaps = [...this.#gaps].sort((a, b) => a.x - b.x);

    let currentX = 0;
    for (const gap of sortedGaps) {
      if (gap.x > currentX) {
        this.#drawSolidGroundSegment(currentX, gap.x);
      }
      // Draw Dark Abyss Pitfall Gap
      this.#drawPitfallGap(gap.x, gap.x + gap.w);
      currentX = gap.x + gap.w;
    }
    if (currentX < this.#width) {
      this.#drawSolidGroundSegment(currentX, this.#width);
    }
  }

  #drawSolidGroundSegment(x1, x2) {
    const w = x2 - x1;
    if (w <= 0) return;

    // Soil Body (Gradient)
    const earthGrad = this.#ctx.createLinearGradient(0, this.#groundY, 0, this.#height);
    earthGrad.addColorStop(0, '#15803d');
    earthGrad.addColorStop(0.1, '#166534');
    earthGrad.addColorStop(0.14, '#78350f');
    earthGrad.addColorStop(1, '#451a03');
    this.#ctx.fillStyle = earthGrad;
    this.#ctx.fillRect(x1, this.#groundY, w, this.#height - this.#groundY);

    // Grass Top Line
    this.#ctx.fillStyle = '#4ade80';
    this.#ctx.fillRect(x1, this.#groundY, w, 3.5);
  }

  #drawPitfallGap(x1, x2) {
    const w = x2 - x1;
    if (w <= 0) return;

    // Dark Abyss Pitfall Gradient
    const pitGrad = this.#ctx.createLinearGradient(0, this.#groundY, 0, this.#height);
    pitGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    pitGrad.addColorStop(0.7, '#020617');
    pitGrad.addColorStop(1, '#ef4444'); // Magma glow at bottom!
    this.#ctx.fillStyle = pitGrad;
    this.#ctx.fillRect(x1, this.#groundY, w, this.#height - this.#groundY);

    // Hanging grass roots at gap edges
    this.#ctx.fillStyle = '#166534';
    this.#ctx.fillRect(x1 - 2, this.#groundY, 4, 8);
    this.#ctx.fillRect(x2 - 2, this.#groundY, 4, 8);
  }

  #drawEnemy(e) {
    this.#ctx.save();
    this.#ctx.translate(e.x, e.y);

    if (e.type === 'shroom') {
      // Cogumelo Selvagem (Monster Shroom)
      const waddle = Math.sin(e.anim) * 2;

      // Stem (Legs/Body)
      this.#ctx.fillStyle = '#fef3c7';
      this.#ctx.fillRect(6, 12 + waddle, 14, 12);

      // Cap (Brown Mushroom Cap)
      this.#ctx.fillStyle = '#78350f';
      this.#ctx.beginPath();
      this.#ctx.arc(13, 10 + waddle, 13, Math.PI, 0);
      this.#ctx.fill();

      // White Spots on Cap
      this.#ctx.fillStyle = '#ffffff';
      this.#ctx.beginPath();
      this.#ctx.arc(8, 6 + waddle, 3, 0, Math.PI * 2);
      this.#ctx.arc(17, 7 + waddle, 2.5, 0, Math.PI * 2);
      this.#ctx.fill();

      // Angry Eyes
      this.#ctx.fillStyle = '#000000';
      this.#ctx.beginPath();
      this.#ctx.arc(9, 15 + waddle, 2, 0, Math.PI * 2);
      this.#ctx.arc(17, 15 + waddle, 2, 0, Math.PI * 2);
      this.#ctx.fill();
    } else if (e.type === 'turtle') {
      // Tarta-Espinho (Spiky Turtle Shell)
      const walkAnim = Math.floor(e.anim) % 2 === 0 ? 0 : 2;

      // Spiky Shell (Green & Yellow)
      this.#ctx.fillStyle = '#22c55e';
      this.#ctx.beginPath();
      this.#ctx.arc(14, 12, 12, Math.PI, 0);
      this.#ctx.fill();

      // Shell Spikes
      this.#ctx.fillStyle = '#facc15';
      this.#ctx.beginPath();
      this.#ctx.moveTo(6, 4); this.#ctx.lineTo(8, 0); this.#ctx.lineTo(10, 4);
      this.#ctx.moveTo(12, 2); this.#ctx.lineTo(14, -2); this.#ctx.lineTo(16, 2);
      this.#ctx.moveTo(18, 4); this.#ctx.lineTo(20, 0); this.#ctx.lineTo(22, 4);
      this.#ctx.fill();

      // Feet (Yellow)
      this.#ctx.fillStyle = '#eab308';
      this.#ctx.fillRect(4 + walkAnim, 18, 7, 6);
      this.#ctx.fillRect(17 - walkAnim, 18, 7, 6);
    }

    this.#ctx.restore();
  }

  #drawHeroCharacter() {
    this.#ctx.save();
    this.#ctx.translate(this.#player.x, this.#player.y);

    // Star Powerup Rainbow Glow
    if (this.#player.starTimer > 0) {
      this.#ctx.shadowBlur = 18;
      this.#ctx.shadowColor = '#facc15';
    }

    // 1. Red Cap (Boné de Encanador)
    this.#ctx.fillStyle = '#ef4444';
    this.#ctx.beginPath();
    this.#ctx.arc(15, 10, 10, Math.PI * 0.9, Math.PI * 2.1);
    this.#ctx.fill();

    // Visor / Brim of Cap
    this.#ctx.fillRect(16, 8, 12, 4);

    // Cap Badge Icon (White circle + Red M/S emblem)
    this.#ctx.fillStyle = '#ffffff';
    this.#ctx.beginPath();
    this.#ctx.arc(12, 8, 3.5, 0, Math.PI * 2);
    this.#ctx.fill();
    this.#ctx.fillStyle = '#ef4444';
    this.#ctx.font = 'bold 5px sans-serif';
    this.#ctx.fillText('S', 10.5, 9.5);

    // 2. Head & Skin
    this.#ctx.fillStyle = '#fed7aa'; // Skin tone
    this.#ctx.beginPath();
    this.#ctx.arc(14, 14, 8, 0, Math.PI * 2);
    this.#ctx.fill();

    // Eye
    this.#ctx.fillStyle = '#000000';
    this.#ctx.beginPath();
    this.#ctx.arc(18, 13, 1.5, 0, Math.PI * 2);
    this.#ctx.fill();

    // Mustache (Big Brown Plumber Mustache)
    this.#ctx.fillStyle = '#78350f';
    this.#ctx.beginPath();
    this.#ctx.ellipse(17, 16, 5, 2.5, 0, 0, Math.PI * 2);
    this.#ctx.fill();

    // 3. Torso (Red Shirt & Blue Overalls)
    this.#ctx.fillStyle = '#ef4444'; // Red Shirt
    this.#ctx.fillRect(6, 20, 18, 10);

    this.#ctx.fillStyle = '#1d4ed8'; // Blue Overalls (Jardineira Jeans)
    this.#ctx.fillRect(7, 24, 16, 12);

    // Overalls Straps
    this.#ctx.fillRect(9, 20, 3, 5);
    this.#ctx.fillRect(18, 20, 3, 5);

    // Golden Strap Buttons
    this.#ctx.fillStyle = '#facc15';
    this.#ctx.fillRect(9.5, 23.5, 2, 2);
    this.#ctx.fillRect(18.5, 23.5, 2, 2);

    // White Gloves (Mãozinhas)
    this.#ctx.fillStyle = '#ffffff';
    this.#ctx.beginPath();
    this.#ctx.arc(4, 25, 3.5, 0, Math.PI * 2);
    this.#ctx.arc(26, 25, 3.5, 0, Math.PI * 2);
    this.#ctx.fill();

    // 4. Legs & Boots (Botas de Couro)
    this.#ctx.fillStyle = '#78350f'; // Brown boots
    if (!this.#player.grounded) {
      // Airborne Jump Pose
      this.#ctx.fillRect(6, 34, 8, 8);
      this.#ctx.fillRect(17, 32, 8, 8);
    } else {
      // Running Leg Cycle
      const legOff = Math.sin(this.#player.animFrame) * 7;
      this.#ctx.fillRect(6 + legOff, 34, 7, 9);
      this.#ctx.fillRect(18 - legOff, 34, 7, 9);
    }

    this.#ctx.restore();
  }
}
