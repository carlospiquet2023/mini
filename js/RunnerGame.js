/* ===========================================
   RunnerGame — Super Pulo / Ultimate Platformer
   Canvas 2D Side-Scroller with Full Controls (Move Left/Right/Crouch/Jump),
   Moving Conveyor Platforms (Esteiras Móveis),
   Fiery Lava Pits, 5 Enemy Types & 4 Obstacle Types
   =========================================== */

import { configureCanvas } from './utils/canvas.js';

export default class RunnerGame {
  #canvas;
  #ctx;
  #callbacks;
  #width = 300;
  #height = 500;
  #isRunning = false;
  #lastTime = 0;
  #animationFrameId = null;
  #initialized = false;
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
  #speed = 160;
  #distance = 0;
  #spawnTimer = 0;
  #nextSpawn = 1.3;
  #coinTimer = 0;

  // Sprites
  #heroSprite = null;
  #heroSpriteLoaded = false;
  #shroomSprite = null;
  #shroomSpriteLoaded = false;
  #droneSprite = null;
  #droneSpriteLoaded = false;
  #lavaSprite = null;
  #lavaSpriteLoaded = false;
  #crabSprite = null;
  #crabSpriteLoaded = false;

  // Controls
  #leftPressed = false;
  #rightPressed = false;
  #downPressed = false;

  // Player
  #player = {
    x: 50,
    y: 0,
    w: 30,
    h: 44,
    vx: 0,
    vy: 0,
    grounded: true,
    jumpsLeft: 2,
    invulnerableTimer: 0,
    starTimer: 0,
    animFrame: 0,
    isFallingInGap: false,
    isCrouching: false
  };

  // World Entities
  #gaps = [];             // Buracos no chão com Lava
  #platforms = [];        // Esteiras Rolantes / Plataformas Móveis
  #enemies = [];          // 5 Tipos: shroom, turtle, drone, lava, crab
  #obstacles = [];        // 4 Tipos: crate, brick, laser, spiked_boulder
  #coinsList = [];        // Moedas de ouro
  #powerups = [];         // Estrelas ⭐
  #particles = [];        // Efeitos visuais
  #clouds = [];
  #hills = [];

  constructor(canvas, ctx, callbacks = {}) {
    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#callbacks = callbacks;
    this.#loadSprites();
  }

  #loadSprites() {
    this.#loadTransparentSprite('assets/runner_hero.png', (canvas) => {
      this.#heroSprite = canvas;
      this.#heroSpriteLoaded = true;
    });
    this.#loadTransparentSprite('assets/shroom_enemy.png', (canvas) => {
      this.#shroomSprite = canvas;
      this.#shroomSpriteLoaded = true;
    });
    this.#loadTransparentSprite('assets/drone_enemy.png', (canvas) => {
      this.#droneSprite = canvas;
      this.#droneSpriteLoaded = true;
    });
    this.#loadTransparentSprite('assets/lava_monster.png', (canvas) => {
      this.#lavaSprite = canvas;
      this.#lavaSpriteLoaded = true;
    });
    this.#loadTransparentSprite('assets/alien_crab.png', (canvas) => {
      this.#crabSprite = canvas;
      this.#crabSpriteLoaded = true;
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

    configureCanvas(this.#canvas, this.#ctx, this.#width, this.#height);

    if (!this.#initialized) {
      this.#initBackground();
      this.restart();
    }

    this.#lastTime = performance.now();
    this.#gameLoop(this.#lastTime);
  }

  stop() {
    this.#isRunning = false;
    this.#leftPressed = false;
    this.#rightPressed = false;
    this.#downPressed = false;
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
    this.#speed = 160;
    this.#distance = 0;
    this.#spawnTimer = 0;
    this.#nextSpawn = 1.3;
    this.#coinTimer = 0;
    this.#shakeAmount = 0;

    this.#leftPressed = false;
    this.#rightPressed = false;
    this.#downPressed = false;

    this.#gaps = [];
    this.#platforms = [];
    this.#enemies = [];
    this.#obstacles = [];
    this.#coinsList = [];
    this.#powerups = [];
    this.#particles = [];
    this.#initialized = true;

    this.#groundY = this.#height * 0.78;

    this.#player = {
      x: Math.floor(this.#width * 0.18),
      y: this.#groundY - 44,
      w: 30,
      h: 44,
      vx: 0,
      vy: 0,
      grounded: true,
      jumpsLeft: 2,
      invulnerableTimer: 0,
      starTimer: 0,
      animFrame: 0,
      isFallingInGap: false,
      isCrouching: false
    };

    if (this.#callbacks.onScoreChange) this.#callbacks.onScoreChange(this.#score);
  }

  resize(width, height) {
    const size = configureCanvas(this.#canvas, this.#ctx, width, height);
    this.#width = size.width;
    this.#height = size.height;

    this.#groundY = this.#height * 0.78;
    this.#initBackground();
    if (this.#player.grounded && !this.#player.isFallingInGap) {
      this.#player.y = this.#groundY - this.#player.h;
    }
  }

  get score() { return this.#score; }
  get lives() { return this.#lives; }

  onDirection(dir, pressed) {
    if (this.#state !== 'PLAYING') {
      if (pressed) this.restart();
      return;
    }
    if (dir === 'left') this.#leftPressed = pressed;
    if (dir === 'right') this.#rightPressed = pressed;
    if (dir === 'down') this.#downPressed = pressed;
    if (dir === 'up' && pressed) this.#jump();
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

    this.#player.animFrame += dt * 14;
    if (this.#player.invulnerableTimer > 0) this.#player.invulnerableTimer -= dt;
    if (this.#player.starTimer > 0) this.#player.starTimer -= dt;

    // CROUCH MECHANIC
    if (this.#downPressed && this.#player.grounded && !this.#player.isFallingInGap) {
      if (!this.#player.isCrouching) {
        this.#player.isCrouching = true;
        this.#player.h = 24;
        this.#player.y = this.#groundY - 24;
      }
    } else if (this.#player.isCrouching) {
      this.#player.isCrouching = false;
      this.#player.h = 44;
      this.#player.y = this.#groundY - 44;
    }

    // MOVEMENT
    let moveVx = 0;
    if (this.#leftPressed) moveVx = -190;
    if (this.#rightPressed) moveVx = 220;

    this.#player.x += moveVx * dt;
    if (this.#player.x < 10) this.#player.x = 10;

    let worldScrollSpeed = this.#speed;
    if (this.#player.x > this.#width * 0.45) {
      const overflow = this.#player.x - this.#width * 0.45;
      this.#player.x = this.#width * 0.45;
      worldScrollSpeed += overflow * 5;
    }
    this.#distance += worldScrollSpeed * dt;
    this.#score = Math.floor(this.#distance / 10) + this.#coins * 10;
    if (this.#callbacks.onScoreChange) this.#callbacks.onScoreChange(this.#score);

    // Gaps
    const pxCenter = this.#player.x + this.#player.w / 2;
    let overGap = false;
    for (const g of this.#gaps) {
      if (pxCenter > g.x && pxCenter < g.x + g.w) {
        overGap = true;
        break;
      }
    }

    // Platforms
    let landedOnPlatform = false;
    for (const p of this.#platforms) {
      if (pxCenter > p.x && pxCenter < p.x + p.w) {
        if (this.#player.vy >= 0 && this.#player.y + this.#player.h >= p.y - 4 && this.#player.y + this.#player.h <= p.y + 12) {
          landedOnPlatform = true;
          this.#player.y = p.y - this.#player.h;
          this.#player.vy = 0;
          this.#player.grounded = true;
          this.#player.jumpsLeft = 2;
          this.#player.x += p.moveVx * dt;
          break;
        }
      }
    }

    // Gravity
    if (!landedOnPlatform) {
      this.#player.vy += this.#gravity * dt;
      this.#player.y += this.#player.vy * dt;

      if (overGap && this.#player.y + this.#player.h >= this.#groundY - 2) {
        this.#player.isFallingInGap = true;
        this.#player.grounded = false;
      }

      if (!this.#player.isFallingInGap) {
        if (this.#player.y >= this.#groundY - this.#player.h) {
          this.#player.y = this.#groundY - (this.#player.isCrouching ? 24 : 44);
          this.#player.vy = 0;
          this.#player.grounded = true;
          this.#player.jumpsLeft = 2;
        }
      } else {
        if (this.#player.y > this.#height + 40) {
          this.#createSquishParticles(this.#player.x, this.#height - 30, '#ef4444');
          this.#lives--;
          this.#callbacks.onStateChange?.();
          this.#shakeAmount = 22;

          if (this.#lives <= 0) {
            this.#state = 'GAMEOVER';
            if (this.#callbacks.onGameOver) this.#callbacks.onGameOver(this.#score);
          } else {
            this.#player.isFallingInGap = false;
            this.#player.x = 40;
            this.#player.y = this.#groundY - 44;
            this.#player.vy = 0;
            this.#player.grounded = true;
            this.#player.invulnerableTimer = 1.8;
            this.#player.jumpsLeft = 2;
          }
        }
      }
    }

    // Parallax
    for (const c of this.#clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.w < 0) c.x = this.#width + Math.random() * 30;
    }
    for (const h of this.#hills) {
      h.x -= (worldScrollSpeed * 0.3) * dt;
      if (h.x + h.w < 0) h.x = this.#width + Math.random() * 20;
    }

    // Spawners
    this.#spawnTimer += dt;
    if (this.#spawnTimer >= this.#nextSpawn) {
      this.#spawnTimer = 0;
      this.#nextSpawn = Math.max(0.85, 1.7 - (worldScrollSpeed / 600));
      this.#spawnWorldElement();
    }

    this.#coinTimer += dt;
    if (this.#coinTimer >= 1.2) {
      this.#coinTimer = 0;
      this.#spawnCoinGroup();
    }

    // Entity updates
    for (let i = this.#gaps.length - 1; i >= 0; i--) {
      const g = this.#gaps[i];
      g.x -= worldScrollSpeed * dt;
      if (g.x + g.w < -40) this.#gaps.splice(i, 1);
    }
    for (let i = this.#platforms.length - 1; i >= 0; i--) {
      const p = this.#platforms[i];
      p.x -= worldScrollSpeed * dt;
      p.time += dt;
      p.moveVx = Math.cos(p.time * 2.5) * 70;
      p.x += p.moveVx * dt;
      if (p.x + p.w < -60) this.#platforms.splice(i, 1);
    }
    for (let i = this.#enemies.length - 1; i >= 0; i--) {
      const e = this.#enemies[i];
      e.x -= (worldScrollSpeed + (e.walkSpeed || 30)) * dt;
      e.anim += dt * 8;

      if (e.type === 'drone') {
        e.y = (this.#groundY - 65) + Math.sin(e.anim * 0.5) * 15;
      }
      if (e.x + e.w < -40) this.#enemies.splice(i, 1);
    }
    for (let i = this.#obstacles.length - 1; i >= 0; i--) {
      const obs = this.#obstacles[i];
      obs.x -= worldScrollSpeed * dt;
      obs.anim = (obs.anim || 0) + dt * 6;
      if (obs.x + obs.w < -40) this.#obstacles.splice(i, 1);
    }
    for (let i = this.#coinsList.length - 1; i >= 0; i--) {
      const coin = this.#coinsList[i];
      coin.x -= worldScrollSpeed * dt;
      coin.anim += dt * 8;
      if (coin.x < -30) this.#coinsList.splice(i, 1);
    }
    for (let i = this.#powerups.length - 1; i >= 0; i--) {
      const p = this.#powerups[i];
      p.x -= worldScrollSpeed * dt;
      if (p.x < -30) this.#powerups.splice(i, 1);
    }
    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const p = this.#particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.#particles.splice(i, 1);
    }

    this.#checkCollisions();
  }

  #spawnWorldElement() {
    const rnd = Math.random();

    if (rnd < 0.30) {
      // Pitfall Lava Gap + Moving Platform
      const gapW = 60 + Math.random() * 30;
      const gapX = this.#width + 40;
      this.#gaps.push({ x: gapX, w: gapW });

      this.#platforms.push({
        x: gapX + 10,
        y: this.#groundY - 45,
        w: 46, h: 14,
        time: Math.random() * Math.PI,
        moveVx: 0
      });
    } else if (rnd < 0.68) {
      // Spawn 1 of 5 ENEMY TYPES (shroom, turtle, drone, lava, crab)
      const enemyRnd = Math.random();
      if (enemyRnd < 0.25) {
        this.#enemies.push({
          type: 'shroom',
          x: this.#width + 40,
          y: this.#groundY - 28,
          w: 28, h: 28,
          walkSpeed: 25, anim: 0
        });
      } else if (enemyRnd < 0.45) {
        this.#enemies.push({
          type: 'turtle',
          x: this.#width + 40,
          y: this.#groundY - 24,
          w: 28, h: 24,
          walkSpeed: 35, anim: 0
        });
      } else if (enemyRnd < 0.65) {
        // Flying Drone Sentinel
        this.#enemies.push({
          type: 'drone',
          x: this.#width + 40,
          y: this.#groundY - 65,
          w: 32, h: 26,
          walkSpeed: 45, anim: 0
        });
      } else if (enemyRnd < 0.85) {
        // Alien Crab Walker
        this.#enemies.push({
          type: 'crab',
          x: this.#width + 40,
          y: this.#groundY - 26,
          w: 30, h: 26,
          walkSpeed: 55, anim: 0
        });
      } else {
        // Lava Monster
        this.#enemies.push({
          type: 'lava',
          x: this.#width + 40,
          y: this.#groundY - 32,
          w: 32, h: 32,
          walkSpeed: 20, anim: 0
        });
      }
    } else {
      // Spawn 1 of 4 OBSTACLE TYPES (crate, brick, laser, spiked_boulder)
      const obsRnd = Math.random();
      if (obsRnd < 0.3) {
        this.#obstacles.push({ type: 'crate', x: this.#width + 40, y: this.#groundY - 30, w: 30, h: 30 });
      } else if (obsRnd < 0.55) {
        this.#obstacles.push({ type: 'brick', x: this.#width + 40, y: this.#groundY - 65, w: 30, h: 30 });
      } else if (obsRnd < 0.80) {
        // HIGH-VOLTAGE LASER BARRIER (MUST CROUCH UNDERNEATH!)
        this.#obstacles.push({ type: 'laser', x: this.#width + 40, y: this.#groundY - 50, w: 45, h: 18, anim: 0 });
      } else {
        // SPIKED METAL BOULDER
        this.#obstacles.push({ type: 'spiked_boulder', x: this.#width + 40, y: this.#groundY - 34, w: 34, h: 34, anim: 0 });
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

    // Coins
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

    // Powerups (⭐)
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

    // Enemies (5 Types)
    for (let i = this.#enemies.length - 1; i >= 0; i--) {
      const e = this.#enemies[i];
      if (px < e.x + e.w && px + pw > e.x && py < e.y + e.h && py + ph > e.y) {
        if (this.#player.starTimer > 0) {
          this.#createSquishParticles(e.x + e.w / 2, e.y + e.h / 2, '#facc15');
          this.#enemies.splice(i, 1);
          this.#score += 50;
          continue;
        }

        const isStomping = (this.#player.vy > 0) && (py + ph - this.#player.vy * 0.1 <= e.y + 12);
        if (isStomping) {
          this.#player.vy = -380;
          this.#player.jumpsLeft = 1;
          this.#createSquishParticles(e.x + e.w / 2, e.y + e.h / 2, '#78350f');
          this.#enemies.splice(i, 1);
          this.#score += 50;
          this.#shakeAmount = 6;
        } else if (this.#player.invulnerableTimer <= 0) {
          this.#lives--;
          this.#callbacks.onStateChange?.();
          this.#shakeAmount = 15;
          this.#player.invulnerableTimer = 1.6;

          if (this.#lives <= 0) {
            this.#state = 'GAMEOVER';
            if (this.#callbacks.onGameOver) this.#callbacks.onGameOver(this.#score);
          }
        }
      }
    }

    // Obstacles (Crate, Brick, Laser, Spiked Boulder)
    for (let i = this.#obstacles.length - 1; i >= 0; i--) {
      const obs = this.#obstacles[i];
      if (px < obs.x + obs.w && px + pw > obs.x && py < obs.y + obs.h && py + ph > obs.y) {
        if (this.#player.starTimer > 0) {
          this.#createSquishParticles(obs.x + obs.w / 2, obs.y + obs.h / 2, '#b45309');
          this.#obstacles.splice(i, 1);
        } else if (this.#player.invulnerableTimer <= 0) {
          if (obs.type === 'laser') {
            // Must crouch under laser! If standing, take damage!
            if (!this.#player.isCrouching) {
              this.#lives--;
              this.#callbacks.onStateChange?.();
              this.#shakeAmount = 15;
              this.#player.invulnerableTimer = 1.5;
              if (this.#lives <= 0) {
                this.#state = 'GAMEOVER';
                if (this.#callbacks.onGameOver) this.#callbacks.onGameOver(this.#score);
              }
            }
          } else if (this.#player.vy > 0 && py + ph - this.#player.vy * 0.1 <= obs.y + 8) {
            this.#player.y = obs.y - (this.#player.isCrouching ? 24 : 44);
            this.#player.vy = 0;
            this.#player.grounded = true;
            this.#player.jumpsLeft = 2;
          } else if (!this.#player.isCrouching) {
            this.#lives--;
            this.#callbacks.onStateChange?.();
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

    if (this.#shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * this.#shakeAmount;
      const sy = (Math.random() - 0.5) * this.#shakeAmount;
      this.#ctx.translate(sx, sy);
    }

    // Sky
    const skyGrad = this.#ctx.createLinearGradient(0, 0, 0, this.#groundY);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.65, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    this.#ctx.fillStyle = skyGrad;
    this.#ctx.fillRect(0, 0, this.#width, this.#groundY);

    // Sun
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

    // Parallax Hills
    this.#ctx.fillStyle = '#0369a1';
    this.#ctx.globalAlpha = 0.35;
    for (const h of this.#hills) {
      this.#ctx.beginPath();
      this.#ctx.arc(h.x + h.w / 2, this.#groundY, h.w / 2, Math.PI, 0);
      this.#ctx.fill();
    }
    this.#ctx.globalAlpha = 1.0;

    // Ground & Lava
    this.#drawGroundAndGaps();

    // Platforms
    for (const p of this.#platforms) {
      this.#drawConveyorPlatform(p);
    }

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

    // Obstacles (4 Types: Crate, Brick, Laser, Spiked Boulder)
    for (const obs of this.#obstacles) {
      this.#drawObstacle(obs);
    }

    // Enemies (5 Types)
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

    // Shadow
    if (this.#player.grounded && !this.#player.isFallingInGap) {
      this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      this.#ctx.beginPath();
      this.#ctx.ellipse(this.#player.x + this.#player.w / 2, this.#groundY - 2, this.#player.w / 2, 4, 0, 0, Math.PI * 2);
      this.#ctx.fill();
    }

    // HERO SPRITE
    if (this.#player.invulnerableTimer <= 0 || Math.floor(performance.now() / 100) % 2 === 0) {
      this.#drawHeroCharacter();
    }

    // Top UI Bar
    this.#ctx.save();
    this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.#ctx.fillRect(0, 0, this.#width, 24);

    this.#ctx.font = 'bold 12px Fredoka, sans-serif';
    this.#ctx.textBaseline = 'middle';

    let hearts = '';
    for (let i = 0; i < 3; i++) hearts += i < this.#lives ? '❤️ ' : '💔 ';
    this.#ctx.fillStyle = '#ffffff';
    this.#ctx.fillText(hearts, 8, 12);

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
    const sortedGaps = [...this.#gaps].sort((a, b) => a.x - b.x);

    let currentX = 0;
    for (const gap of sortedGaps) {
      if (gap.x > currentX) {
        this.#drawSolidGroundSegment(currentX, gap.x);
      }
      this.#drawLavaGap(gap.x, gap.x + gap.w);
      currentX = gap.x + gap.w;
    }
    if (currentX < this.#width) {
      this.#drawSolidGroundSegment(currentX, this.#width);
    }
  }

  #drawSolidGroundSegment(x1, x2) {
    const w = x2 - x1;
    if (w <= 0) return;

    const earthGrad = this.#ctx.createLinearGradient(0, this.#groundY, 0, this.#height);
    earthGrad.addColorStop(0, '#15803d');
    earthGrad.addColorStop(0.1, '#166534');
    earthGrad.addColorStop(0.14, '#78350f');
    earthGrad.addColorStop(1, '#451a03');
    this.#ctx.fillStyle = earthGrad;
    this.#ctx.fillRect(x1, this.#groundY, w, this.#height - this.#groundY);

    this.#ctx.fillStyle = '#4ade80';
    this.#ctx.fillRect(x1, this.#groundY, w, 3.5);
  }

  #drawLavaGap(x1, x2) {
    const w = x2 - x1;
    if (w <= 0) return;

    const lavaGrad = this.#ctx.createLinearGradient(0, this.#groundY, 0, this.#height);
    lavaGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    lavaGrad.addColorStop(0.5, '#7f1d1d');
    lavaGrad.addColorStop(0.8, '#ef4444');
    lavaGrad.addColorStop(1, '#facc15');
    this.#ctx.fillStyle = lavaGrad;
    this.#ctx.fillRect(x1, this.#groundY, w, this.#height - this.#groundY);

    this.#ctx.fillStyle = '#f97316';
    this.#ctx.beginPath();
    const time = performance.now() * 0.005;
    for (let x = x1; x <= x2; x += 4) {
      const lavaY = this.#height - 25 + Math.sin(time + x * 0.1) * 4;
      if (x === x1) this.#ctx.moveTo(x, lavaY);
      else this.#ctx.lineTo(x, lavaY);
    }
    this.#ctx.lineTo(x2, this.#height);
    this.#ctx.lineTo(x1, this.#height);
    this.#ctx.fill();

    this.#ctx.fillStyle = '#166534';
    this.#ctx.fillRect(x1 - 2, this.#groundY, 4, 8);
    this.#ctx.fillRect(x2 - 2, this.#groundY, 4, 8);
  }

  #drawConveyorPlatform(p) {
    this.#ctx.save();
    this.#ctx.translate(p.x, p.y);

    this.#ctx.fillStyle = '#475569';
    this.#ctx.strokeStyle = '#38bdf8';
    this.#ctx.lineWidth = 2;
    this.#ctx.shadowBlur = 6;
    this.#ctx.shadowColor = '#38bdf8';
    this.#ctx.beginPath();
    this.#ctx.roundRect(0, 0, p.w, p.h, 6);
    this.#ctx.fill();
    this.#ctx.stroke();

    this.#ctx.fillStyle = '#94a3b8';
    const offset = (performance.now() * 0.03) % 10;
    for (let x = 4 + offset; x < p.w - 4; x += 10) {
      this.#ctx.fillRect(x, 3, 4, p.h - 6);
    }

    this.#ctx.restore();
  }

  #drawObstacle(obs) {
    this.#ctx.save();
    this.#ctx.translate(obs.x, obs.y);

    if (obs.type === 'brick') {
      this.#ctx.fillStyle = '#b45309';
      this.#ctx.strokeStyle = '#78350f';
      this.#ctx.lineWidth = 2;
      this.#ctx.fillRect(0, 0, obs.w, obs.h);
      this.#ctx.strokeRect(0, 0, obs.w, obs.h);
      this.#ctx.strokeStyle = '#78350f';
      this.#ctx.beginPath();
      this.#ctx.moveTo(0, obs.h / 2); this.#ctx.lineTo(obs.w, obs.h / 2);
      this.#ctx.moveTo(obs.w / 2, 0); this.#ctx.lineTo(obs.w / 2, obs.h / 2);
      this.#ctx.stroke();
    } else if (obs.type === 'crate') {
      this.#ctx.fillStyle = '#d97706';
      this.#ctx.strokeStyle = '#78350f';
      this.#ctx.lineWidth = 2;
      this.#ctx.fillRect(0, 0, obs.w, obs.h);
      this.#ctx.strokeRect(0, 0, obs.w, obs.h);
      this.#ctx.beginPath();
      this.#ctx.moveTo(2, 2); this.#ctx.lineTo(obs.w - 2, obs.h - 2);
      this.#ctx.moveTo(obs.w - 2, 2); this.#ctx.lineTo(2, obs.h - 2);
      this.#ctx.stroke();
    } else if (obs.type === 'laser') {
      // HIGH-VOLTAGE LASER BARRIER (MUST CROUCH UNDERNEATH!)
      this.#ctx.shadowBlur = 12;
      this.#ctx.shadowColor = '#38bdf8';
      this.#ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      this.#ctx.fillRect(0, 4, obs.w, 10);

      // Flashing Core Beam
      const flash = Math.floor(obs.anim * 10) % 2 === 0;
      this.#ctx.fillStyle = flash ? '#ffffff' : '#06b6d4';
      this.#ctx.fillRect(0, 7, obs.w, 4);

      // Posts on sides
      this.#ctx.fillStyle = '#1e293b';
      this.#ctx.fillRect(-4, 0, 6, obs.h);
      this.#ctx.fillRect(obs.w - 2, 0, 6, obs.h);
    } else if (obs.type === 'spiked_boulder') {
      // SPIKED METAL BOULDER
      this.#ctx.translate(obs.w / 2, obs.h / 2);
      this.#ctx.rotate(obs.anim * 2);
      this.#ctx.fillStyle = '#475569';
      this.#ctx.beginPath();
      this.#ctx.arc(0, 0, obs.w / 2, 0, Math.PI * 2);
      this.#ctx.fill();

      // Spikes
      this.#ctx.fillStyle = '#e2e8f0';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        this.#ctx.beginPath();
        this.#ctx.moveTo(Math.cos(a) * (obs.w / 2), Math.sin(a) * (obs.h / 2));
        this.#ctx.lineTo(Math.cos(a) * (obs.w / 2 + 6), Math.sin(a) * (obs.h / 2 + 6));
        this.#ctx.stroke();
      }
    }

    this.#ctx.restore();
  }

  #drawEnemy(e) {
    this.#ctx.save();
    this.#ctx.translate(e.x, e.y);

    if (e.type === 'shroom' && this.#shroomSpriteLoaded) {
      const w = 32;
      const h = 30;
      const waddle = Math.sin(e.anim) * 2;
      this.#ctx.shadowBlur = 8;
      this.#ctx.shadowColor = '#78350f';
      this.#ctx.drawImage(this.#shroomSprite, -3, waddle - 4, w, h);
    } else if (e.type === 'drone' && this.#droneSpriteLoaded) {
      const w = 36;
      const h = 30;
      this.#ctx.shadowBlur = 14;
      this.#ctx.shadowColor = '#38bdf8';
      this.#ctx.drawImage(this.#droneSprite, -2, -2, w, h);
    } else if (e.type === 'lava' && this.#lavaSpriteLoaded) {
      const w = 36;
      const h = 36;
      this.#ctx.shadowBlur = 14;
      this.#ctx.shadowColor = '#ef4444';
      this.#ctx.drawImage(this.#lavaSprite, -2, -2, w, h);
    } else if (e.type === 'crab' && this.#crabSpriteLoaded) {
      const w = 34;
      const h = 30;
      this.#ctx.shadowBlur = 10;
      this.#ctx.shadowColor = '#dc2626';
      this.#ctx.drawImage(this.#crabSprite, -2, -2, w, h);
    } else {
      // Fallback shapes
      this.#ctx.fillStyle = '#ef4444';
      this.#ctx.beginPath();
      this.#ctx.arc(e.w / 2, e.h / 2, e.w / 2, 0, Math.PI * 2);
      this.#ctx.fill();
    }

    this.#ctx.restore();
  }

  #drawHeroCharacter() {
    this.#ctx.save();
    this.#ctx.translate(this.#player.x, this.#player.y);

    if (this.#player.starTimer > 0) {
      this.#ctx.shadowBlur = 18;
      this.#ctx.shadowColor = '#facc15';
    }

    if (this.#heroSpriteLoaded) {
      const w = 46;
      const h = this.#player.isCrouching ? 26 : 46;
      const bob = this.#player.grounded ? Math.sin(this.#player.animFrame) * 2 : 0;
      this.#ctx.shadowBlur = 10;
      this.#ctx.shadowColor = '#38bdf8';
      this.#ctx.drawImage(this.#heroSprite, -8, bob - 2, w, h);
    } else {
      this.#ctx.fillStyle = '#38bdf8';
      this.#ctx.fillRect(0, 0, 30, this.#player.isCrouching ? 24 : 44);
    }

    this.#ctx.restore();
  }
}
