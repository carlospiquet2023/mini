import { configureCanvas } from './utils/canvas.js';

export default class SpaceGame {
  #canvas;
  #ctx;
  #callbacks;
  #width;
  #height;
  #isRunning = false;
  #lastTime = 0;
  #animationFrameId = null;
  #initialized = false;
  #shakeAmount = 0;

  #leftPressed = false;
  #rightPressed = false;
  #upPressed = false;
  #downPressed = false;
  #firePressed = false;

  #state = 'PLAYING'; // 'PLAYING', 'GAMEOVER', 'VICTORY'
  #score = 0;
  #lives = 3;

  // Timers and stats
  #enemySpawnTimer = 0;
  #enemySpawnInterval = 1.5;
  #enemiesKilled = 0;
  #bossKilledTime = 0;
  #wave = 1;
  #waveMessage = '';
  #waveMessageTimer = 0;

  // Entities
  #player;
  #stars = [];
  #nebulae = [];
  #bullets = [];
  #enemies = [];
  #particles = [];
  #powerups = [];
  #boss = null;

  constructor(canvas, ctx, callbacks) {
    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#callbacks = callbacks || {};
    this.#width = 300;
    this.#height = 500;
  }

  start() {
    if (this.#isRunning) return;
    this.#isRunning = true;

    configureCanvas(this.#canvas, this.#ctx, this.#width, this.#height);

    if (!this.#initialized) {
      this.#initBackground();
      this.#initPlayer();
      this.#initialized = true;
    }
    this.#lastTime = performance.now();
    this.#loop(this.#lastTime);
  }

  stop() {
    this.#isRunning = false;
    this.#leftPressed = false;
    this.#rightPressed = false;
    this.#upPressed = false;
    this.#downPressed = false;
    this.#firePressed = false;
    if (this.#animationFrameId) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
  }

  resize(width, height) {
    const size = configureCanvas(this.#canvas, this.#ctx, width, height);
    this.#width = size.width;
    this.#height = size.height;
    if (this.#player) {
      this.#player.y = this.#height * 0.85;
      if (this.#player.x < 0) this.#player.x = 0;
      if (this.#player.x > this.#width) this.#player.x = this.#width;
    }
    // Update boss position proportionally if it exists
    if (this.#boss) {
      this.#boss.targetY = this.#height * 0.12;
      this.#boss.width = this.#width * 0.4;
      this.#boss.height = this.#boss.width * 0.6;
    }
    if (this.#initialized) this.#initBackground();
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
    this.#firePressed = true;
    this.#firePlayerBullets();
    if (this.#player) this.#player.fireTimer = 0;
  }
  onButtonAUp() {
    this.#firePressed = false;
  }
  onButtonBDown() {
    if (this.#state !== 'PLAYING') {
      this.restart();
      return;
    }
    this.#firePressed = true;
    this.#firePlayerBullets();
    if (this.#player) this.#player.fireTimer = 0;
  }
  onButtonBUp() {
    this.#firePressed = false;
  }

  restart() {
    this.#state = 'PLAYING';
    this.#score = 0;
    this.#lives = 3;
    this.#enemySpawnInterval = 1.5;
    this.#enemiesKilled = 0;
    this.#wave = 1;
    this.#waveMessage = '';
    this.#waveMessageTimer = 0;
    this.#boss = null;
    this.#bossKilledTime = 0;
    this.#shakeAmount = 0;

    this.#bullets = [];
    this.#enemies = [];
    this.#particles = [];
    this.#powerups = [];

    this.#initBackground();
    this.#initPlayer();
    this.#initialized = true;
    if (this.#callbacks.onScoreChange) this.#callbacks.onScoreChange(this.#score);

    if (!this.#isRunning) {
      this.start();
    }
  }

  get score() { return this.#score; }
  get lives() { return this.#lives; }
  get wave() { return this.#wave; }

  #initBackground() {
    this.#stars = [];
    // Far
    for (let i = 0; i < 80; i++) {
      this.#stars.push({
        x: Math.random() * this.#width,
        y: Math.random() * this.#height,
        r: 0.5 + Math.random() * 0.5,
        speed: 15,
        opacity: 0.4,
        type: 'far'
      });
    }
    // Mid
    for (let i = 0; i < 50; i++) {
      this.#stars.push({
        x: Math.random() * this.#width,
        y: Math.random() * this.#height,
        r: 1 + Math.random(),
        speed: 40,
        opacity: 0.7,
        type: 'mid'
      });
    }
    // Near
    for (let i = 0; i < 25; i++) {
      this.#stars.push({
        x: Math.random() * this.#width,
        y: Math.random() * this.#height,
        r: 2 + Math.random(),
        speed: 80,
        opacity: 1.0,
        type: 'near'
      });
    }

    this.#nebulae = [
      { x: Math.random() * this.#width, y: Math.random() * this.#height, r: this.#width * 0.3, color: 'rgba(128,0,128,0.06)', speed: 5 },
      { x: Math.random() * this.#width, y: Math.random() * this.#height, r: this.#width * 0.35, color: 'rgba(0,100,255,0.05)', speed: 6 },
    ];
  }

  #initPlayer() {
    this.#player = {
      x: this.#width / 2,
      y: this.#height * 0.85,
      width: 30,
      height: 40,
      speed: 300,
      fireTimer: 0,
      invulnerableTimer: 0,
      powerupType: null, // 'shield' or 'triple'
      powerupTimer: 0
    };
  }

  #loop = (time) => {
    if (!this.#isRunning) return;

    const deltaTime = (time - this.#lastTime) / 1000; // seconds
    this.#lastTime = time;

    // Cap deltaTime to avoid huge jumps on lag
    const dt = Math.min(deltaTime, 0.1);

    this.#update(dt);
    this.#draw();

    this.#animationFrameId = requestAnimationFrame(this.#loop);
  };

  #update(dt) {
    this.#updateBackground(dt);
    this.#updateParticles(dt);

    if (this.#state === 'PLAYING') {
      this.#updatePlayer(dt);
      this.#updateBullets(dt);
      this.#updatePowerups(dt);
      this.#updateBoss(dt);
      this.#updateEnemies(dt);
      this.#checkCollisions();
    } else if (this.#state === 'VICTORY') {
      this.#updatePlayer(dt);
      this.#updateBullets(dt);
      this.#bossKilledTime += dt;
      if (this.#bossKilledTime > 3) {
        this.#state = 'PLAYING';
        this.#enemySpawnInterval = 1.0; // Faster spawns
        this.#boss = null;
      }
    } else if (this.#state === 'GAMEOVER') {
      // Allow background and particles to move
    }

    // Screen shake recovery
    if (this.#shakeAmount > 0) {
      this.#shakeAmount *= 0.9;
      if (this.#shakeAmount < 0.5) this.#shakeAmount = 0;
    }
  }

  #updateBackground(dt) {
    for (const star of this.#stars) {
      star.y += star.speed * dt;
      if (star.y > this.#height) {
        star.y = 0;
        star.x = Math.random() * this.#width;
      }
    }
    for (const nebula of this.#nebulae) {
      nebula.y += nebula.speed * dt;
      if (nebula.y - nebula.r > this.#height) {
        nebula.y = -nebula.r;
        nebula.x = Math.random() * this.#width;
      }
    }
  }

  #updatePlayer(dt) {
    if (this.#leftPressed) this.#player.x -= this.#player.speed * dt;
    if (this.#rightPressed) this.#player.x += this.#player.speed * dt;
    if (this.#upPressed) this.#player.y -= this.#player.speed * dt;
    if (this.#downPressed) this.#player.y += this.#player.speed * dt;

    if (this.#player.x < this.#player.width / 2) this.#player.x = this.#player.width / 2;
    if (this.#player.x > this.#width - this.#player.width / 2) this.#player.x = this.#width - this.#player.width / 2;
    if (this.#player.y < this.#height * 0.15) this.#player.y = this.#height * 0.15;
    if (this.#player.y > this.#height - this.#player.height / 2 - 10) this.#player.y = this.#height - this.#player.height / 2 - 10;

    if (this.#player.invulnerableTimer > 0) {
      this.#player.invulnerableTimer -= dt;
    }
    if (this.#player.powerupTimer > 0) {
      this.#player.powerupTimer -= dt;
      if (this.#player.powerupTimer <= 0) {
        this.#player.powerupType = null;
      }
    }

    // Engine particles
    if (Math.random() < 0.5) {
      this.#createParticle(
        this.#player.x - 5 + Math.random() * 10,
        this.#player.y + this.#player.height / 2,
        (Math.random() - 0.5) * 10,
        50 + Math.random() * 50,
        '#ffaa00',
        0.3, // life in seconds
        1 + Math.random() * 2
      );
    }

    // Firing when holding the action button
    if (this.#firePressed) {
      this.#player.fireTimer += dt;
      if (this.#player.fireTimer >= 0.15) {
        this.#player.fireTimer = 0;
        this.#firePlayerBullets();
      }
    } else {
      this.#player.fireTimer = 0;
    }
  }

  #firePlayerBullets() {
    if (this.#player.powerupType === 'triple') {
      this.#bullets.push({ x: this.#player.x, y: this.#player.y - this.#player.height / 2, vx: 0, vy: -400, type: 'player', w: 2, h: 10 });
      this.#bullets.push({ x: this.#player.x, y: this.#player.y - this.#player.height / 2, vx: -100, vy: -380, type: 'player', w: 2, h: 10 });
      this.#bullets.push({ x: this.#player.x, y: this.#player.y - this.#player.height / 2, vx: 100, vy: -380, type: 'player', w: 2, h: 10 });
    } else {
      this.#bullets.push({ x: this.#player.x, y: this.#player.y - this.#player.height / 2, vx: 0, vy: -400, type: 'player', w: 2, h: 10 });
    }
  }

  #updateBullets(dt) {
    for (let i = this.#bullets.length - 1; i >= 0; i--) {
      const b = this.#bullets[i];
      
      if (b.type === 'spiral') {
        b.spiralAngle += 5 * dt;
        b.vx = Math.cos(b.spiralAngle) * 100;
      } else if (b.type === 'homing' && this.#player) {
        b.life = (b.life ?? 3.5) - dt;
        if (b.life <= 0) {
          this.#createParticle(b.x, b.y, 0, 0, '#ff4444', 0.2, 3);
          this.#bullets.splice(i, 1);
          continue;
        }
        const dx = this.#player.x - b.x;
        const dy = this.#player.y - b.y;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
          const targetVx = (dx / len) * 35;
          const targetVy = (dy / len) * 55;
          b.vx += (targetVx - b.vx) * 0.4 * dt;
          b.vy += (targetVy - b.vy) * 0.4 * dt;
        }
      } else if (b.type === 'wave') {
        b.time = (b.time || 0) + dt;
        b.x = b.startX + Math.sin(b.time * 5) * 40;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.type === 'bomb' && b.y > this.#height * 0.5) {
        for (let j = 0; j < 8; j++) {
          const angle = (j / 8) * Math.PI * 2;
          this.#bullets.push({
            x: b.x, y: b.y,
            vx: Math.cos(angle) * 120, vy: Math.sin(angle) * 120,
            type: 'bombfrag', r: 2
          });
        }
        this.#createExplosion(b.x, b.y, 8, 0.5);
        this.#bullets.splice(i, 1);
        continue;
      }

      if (b.y < -50 || b.y > this.#height + 50 || b.x < -50 || b.x > this.#width + 50) {
        this.#bullets.splice(i, 1);
      }
    }
  }

  #spawnBoss() {
    let name = 'CHEFÃO 1: BIO-CYBER (FÁCIL)';
    let hp = 35;
    let type = 1;
    if (this.#wave === 2) {
      name = 'CHEFÃO 2: DESTRÓIER CÓSMICO (MÉDIO)';
      hp = 60;
      type = 2;
    } else if (this.#wave === 3) {
      name = 'CHEFÃO 3: DREADNOUGHT IMPERIAL (DIFÍCIL)';
      hp = 95;
      type = 3;
    } else if (this.#wave >= 4) {
      name = 'CHEFÃO FINAL: SOBERANO GALÁCTICO (EXTREMO)';
      hp = 140;
      type = 4;
    }

    this.#boss = {
      type,
      name,
      x: this.#width / 2,
      y: -100,
      targetY: this.#height * 0.14,
      width: this.#width * (type === 4 ? 0.52 : 0.44),
      height: this.#width * 0.28,
      hp,
      maxHp: hp,
      state: 'ENTERING',
      time: 0,
      fireTimer: 0,
      spawnTimer: 0,
      hitFlash: 0,
      deathTimer: 2.5,
      explosionTimer: 0,
      explosionsDone: 0,
      cracks: [],
      beamState: 'none',
      beamTimer: 0,
      beamX: 0
    };
    this.#enemies = [];
  }

  #updateBoss(dt) {
    if (!this.#boss) return;
    const b = this.#boss;

    if (b.state === 'ENTERING') {
      b.y += 50 * dt;
      if (b.y >= b.targetY) {
        b.y = b.targetY;
        b.state = 'FIGHTING';
      }
      return;
    }

    if (b.state === 'DYING') {
      b.deathTimer -= dt;
      b.explosionTimer -= dt;
      if (b.explosionTimer <= 0 && b.explosionsDone < 8) {
        this.#createExplosion(b.x + (Math.random() - 0.5) * b.width, b.y + (Math.random() - 0.5) * b.height, 30, 2);
        b.explosionTimer = 0.2;
        b.explosionsDone++;
        this.#shakeAmount = 12;
      }
      if (b.deathTimer <= 0) {
        this.#createExplosion(b.x, b.y, 80, 5);
        this.#shakeAmount = 30;

        if (b.type === 1) {
          this.#addScore(400);
          this.#wave = 2;
          this.#enemiesKilled = 0;
          this.#waveMessage = 'FASE 2: NÍVEL MÉDIO!';
          this.#waveMessageTimer = 3.0;
          this.#boss = null;
        } else if (b.type === 2) {
          this.#addScore(800);
          this.#wave = 3;
          this.#enemiesKilled = 0;
          this.#waveMessage = 'FASE 3: NÍVEL DIFÍCIL!';
          this.#waveMessageTimer = 3.0;
          this.#boss = null;
        } else if (b.type === 3) {
          this.#addScore(1400);
          this.#wave = 4;
          this.#enemiesKilled = 0;
          this.#waveMessage = 'FASE 4: NÍVEL EXTREMO FINAL!';
          this.#waveMessageTimer = 3.5;
          this.#boss = null;
        } else {
          this.#addScore(2500);
          this.#boss = null;
          this.#state = 'VICTORY';
          this.#bossKilledTime = 0;
        }
      }
      return;
    }

    if (b.state === 'FIGHTING') {
      b.time += dt;

      if (b.type === 1) {
        // CHEFÃO 1 (FÁCIL): Aimed 3-shot fan + 1 homing missile
        b.x = this.#width / 2 + Math.sin(b.time * 1.5) * (this.#width * 0.22);
        b.fireTimer += dt;
        if (b.fireTimer >= 2.0) {
          b.fireTimer = 0;
          this.#fireBossAimedFan(3, 30, 140);
        }
        b.spawnTimer += dt;
        if (b.spawnTimer >= 4.0) {
          b.spawnTimer = 0;
          this.#bullets.push({ x: b.x, y: b.y + 10, vx: 0, vy: 50, type: 'homing', w: 4, h: 12 });
        }
      } else if (b.type === 2) {
        // CHEFÃO 2 (MÉDIO): Aimed 5-shot fan + 2 homing missiles
        const speed = b.hp <= 30 ? 2.4 : 1.8;
        b.x = this.#width / 2 + Math.sin(b.time * speed) * (this.#width * 0.28);
        b.fireTimer += dt;
        if (b.fireTimer >= 1.6) {
          b.fireTimer = 0;
          this.#fireBossAimedFan(5, 50, 160);
        }

        b.spawnTimer += dt;
        if (b.spawnTimer >= 3.2) {
          b.spawnTimer = 0;
          this.#bullets.push({ x: b.x - 15, y: b.y + 10, vx: -30, vy: 50, type: 'homing', w: 4, h: 12 });
          this.#bullets.push({ x: b.x + 15, y: b.y + 10, vx: 30, vy: 50, type: 'homing', w: 4, h: 12 });
        }
      } else if (b.type === 3) {
        // CHEFÃO 3 (DIFÍCIL): Aimed 7-shot fan + 3 homing missiles + Mega Beam Cannon
        const speed = b.hp <= 45 ? 3.0 : 2.2;
        b.x = this.#width / 2 + Math.sin(b.time * speed) * (this.#width * 0.32);

        if (b.beamState === 'none') {
          b.fireTimer += dt;
          if (b.fireTimer >= 1.4) {
            b.fireTimer = 0;
            b.attackCycle = (b.attackCycle || 0) + 1;
            if (b.attackCycle >= 3) {
              b.attackCycle = 0;
              b.beamState = 'charging';
              b.beamTimer = 1.2;
              b.beamX = this.#player ? this.#player.x : b.x;
            } else {
              this.#fireBossAimedFan(7, 65, 180);
            }
          }
          b.spawnTimer += dt;
          if (b.spawnTimer >= 2.6) {
            b.spawnTimer = 0;
            this.#bullets.push({ x: b.x - 20, y: b.y + 10, vx: -40, vy: 50, type: 'homing', w: 4, h: 12 });
            this.#bullets.push({ x: b.x, y: b.y + 10, vx: 0, vy: 50, type: 'homing', w: 4, h: 12 });
            this.#bullets.push({ x: b.x + 20, y: b.y + 10, vx: 40, vy: 50, type: 'homing', w: 4, h: 12 });
          }
        } else if (b.beamState === 'charging') {
          b.beamTimer -= dt;
          if (this.#player) b.beamX += (this.#player.x - b.beamX) * 2 * dt;
          if (b.beamTimer <= 0) {
            b.beamState = 'firing';
            b.beamTimer = 1.5;
            this.#shakeAmount = 7;
          }
        } else if (b.beamState === 'firing') {
          b.beamTimer -= dt;
          this.#shakeAmount = 4;
          if (Math.random() < 0.4) {
            this.#createParticle(b.beamX + (Math.random() - 0.5) * 24, b.y + b.height / 2 + Math.random() * this.#height, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, '#ef4444', 0.4, 3);
          }
          if (b.beamTimer <= 0) {
            b.beamState = 'none';
            b.fireTimer = 0;
          }
        }
      } else if (b.type === 4) {
        // CHEFÃO 4 (EXTREMO / FINAL): Rapid Aimed 9-shot fan + 4 homing missiles + Tracking Laser Beam!
        const speed = b.hp <= 60 ? 3.5 : 2.5;
        b.x = this.#width / 2 + Math.sin(b.time * speed) * (this.#width * 0.35);

        if (b.beamState === 'none') {
          b.fireTimer += dt;
          if (b.fireTimer >= 1.1) {
            b.fireTimer = 0;
            b.attackCycle = (b.attackCycle || 0) + 1;
            if (b.attackCycle >= 2) {
              b.attackCycle = 0;
              b.beamState = 'charging';
              b.beamTimer = 1.0;
              b.beamX = this.#player ? this.#player.x : b.x;
            } else {
              this.#fireBossAimedFan(9, 80, 200);
            }
          }
          b.spawnTimer += dt;
          if (b.spawnTimer >= 2.0) {
            b.spawnTimer = 0;
            this.#bullets.push({ x: b.x - 25, y: b.y + 10, vx: -50, vy: 50, type: 'homing', w: 4, h: 12 });
            this.#bullets.push({ x: b.x - 10, y: b.y + 10, vx: -20, vy: 50, type: 'homing', w: 4, h: 12 });
            this.#bullets.push({ x: b.x + 10, y: b.y + 10, vx: 20, vy: 50, type: 'homing', w: 4, h: 12 });
            this.#bullets.push({ x: b.x + 25, y: b.y + 10, vx: 50, vy: 50, type: 'homing', w: 4, h: 12 });
          }
        } else if (b.beamState === 'charging') {
          b.beamTimer -= dt;
          if (this.#player) b.beamX += (this.#player.x - b.beamX) * 3 * dt;
          if (b.beamTimer <= 0) {
            b.beamState = 'firing';
            b.beamTimer = 1.5;
            this.#shakeAmount = 10;
          }
        } else if (b.beamState === 'firing') {
          b.beamTimer -= dt;
          if (this.#player) b.beamX += (this.#player.x - b.beamX) * 1.5 * dt;
          this.#shakeAmount = 5;
          if (Math.random() < 0.5) {
            this.#createParticle(b.beamX + (Math.random() - 0.5) * 30, b.y + b.height / 2 + Math.random() * this.#height, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#f43f5e', 0.4, 4);
          }
          if (b.beamTimer <= 0) {
            b.beamState = 'none';
            b.fireTimer = 0;
          }
        }
      }

      if (b.hitFlash > 0) {
        b.hitFlash -= dt;
      }
    }
  }

  #fireBossAimedFan(count, angleSpread, bulletSpeed = 160) {
    if (!this.#boss || !this.#player) return;
    const dx = this.#player.x - this.#boss.x;
    const dy = this.#player.y - this.#boss.y;
    const centerAngle = Math.atan2(dy, dx);

    const spreadRad = (angleSpread * Math.PI) / 180;
    const startAngle = centerAngle - spreadRad / 2;
    const step = count > 1 ? spreadRad / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const angle = count > 1 ? startAngle + step * i : centerAngle;
      this.#bullets.push({
        x: this.#boss.x,
        y: this.#boss.y + this.#boss.height / 2,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
        type: 'boss',
        r: 5
      });
    }
  }

  #updateEnemies(dt) {
    if (this.#waveMessageTimer > 0) {
      this.#waveMessageTimer -= dt;
    }

    let killsNeeded = 15;
    let spawnRate = 2.0;
    if (this.#wave === 2) { killsNeeded = 25; spawnRate = 1.3; }
    if (this.#wave === 3) { killsNeeded = 35; spawnRate = 0.8; }
    if (this.#wave >= 4) { killsNeeded = 50; spawnRate = 0.5; }

    if (!this.#boss || this.#boss.state === 'DYING') {
      if (this.#boss === null && this.#enemiesKilled >= killsNeeded && this.#state === 'PLAYING') {
        this.#spawnBoss();
      } else if (!this.#boss) {
        // Normal enemy spawning
        this.#enemySpawnTimer += dt;
        if (this.#enemySpawnTimer >= spawnRate) {
          this.#enemySpawnTimer = 0;
          this.#spawnEnemy();
        }
      }
    }

    for (let i = this.#enemies.length - 1; i >= 0; i--) {
      const e = this.#enemies[i];
      e.time += dt;
      e.y += e.speed * dt;

      if (e.type === 'small') {
        e.x += Math.sin(e.time * 5) * 60 * dt;
      } else if (e.type === 'medium') {
        e.x += Math.sin(e.time * 3) * 30 * dt;
        e.fireTimer += dt;
        if (e.fireTimer >= 3) {
          e.fireTimer = 0;
          if (Math.random() < 0.4) {
            this.#bullets.push({ x: e.x, y: e.y + e.w / 2, vx: 0, vy: 100, type: 'spiral', r: 3, spiralAngle: 0 });
          } else {
            this.#bullets.push({ x: e.x, y: e.y + e.w / 2, vx: 0, vy: 150, type: 'enemy', r: 3 });
          }
        }
      } else if (e.type === 'large') {
        e.x += Math.sin(e.time * 2) * 20 * dt;
        e.fireTimer += dt;
        if (e.fireTimer >= 4) {
          e.fireTimer = 0;
          this.#bullets.push({ x: e.x, y: e.y + e.w / 2, vx: 0, vy: 80, type: 'homing', w: 3, h: 12 });
        }
        e.bombTimer = (e.bombTimer || 0) + dt;
        if (e.bombTimer >= 7) {
          e.bombTimer = 0;
          this.#bullets.push({ x: e.x, y: e.y + e.w / 2, vx: 0, vy: 60, type: 'bomb', r: 6 });
        }
      }

      if (e.y > this.#height + 50) {
        this.#enemies.splice(i, 1);
      }
    }
  }

  #spawnEnemy() {
    const rnd = Math.random();
    let type = 'small';
    let hp = 1, speed = 120, w = 20;

    if (this.#wave === 1) {
      if (rnd > 0.85) { type = 'medium'; hp = 2; speed = 80; w = 30; }
    } else if (this.#wave === 2) {
      if (rnd > 0.85) { type = 'large'; hp = 3; speed = 50; w = 45; }
      else if (rnd > 0.5) { type = 'medium'; hp = 2; speed = 80; w = 30; }
    } else if (this.#wave === 3) {
      if (rnd > 0.75) { type = 'large'; hp = 4; speed = 60; w = 45; }
      else if (rnd > 0.3) { type = 'medium'; hp = 2; speed = 90; w = 30; }
    } else {
      if (rnd > 0.6) { type = 'large'; hp = 5; speed = 70; w = 48; }
      else if (rnd > 0.2) { type = 'medium'; hp = 3; speed = 100; w = 32; }
    }

    this.#enemies.push({
      type,
      x: 30 + Math.random() * (this.#width - 60),
      y: -50,
      hp,
      maxHp: hp,
      speed,
      w,
      time: 0,
      fireTimer: 0
    });
  }

  #updatePowerups(dt) {
    for (let i = this.#powerups.length - 1; i >= 0; i--) {
      const p = this.#powerups[i];
      p.y += 60 * dt;
      if (p.y > this.#height + 20) {
        this.#powerups.splice(i, 1);
      }
    }
  }

  #updateParticles(dt) {
    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const p = this.#particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.r *= 0.98;
      p.life -= dt;
      if (p.life <= 0 || p.r < 0.1) {
        this.#particles.splice(i, 1);
      }
    }
  }

  #createParticle(x, y, vx, vy, color, life, r) {
    this.#particles.push({ x, y, vx, vy, color, life, maxLife: life, r });
  }

  #createExplosion(x, y, count, sizeMult = 1) {
    const colors = ['#ff4444', '#ff8800', '#ffcc00', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this.#createParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        colors[Math.floor(Math.random() * colors.length)],
        0.5 + Math.random() * 0.5,
        (2 + Math.random() * 3) * sizeMult
      );
    }
  }

  #checkCollisions() {
    // Player bullets vs Enemies & Boss
    for (let i = this.#bullets.length - 1; i >= 0; i--) {
      const b = this.#bullets[i];
      if (b.type !== 'player') continue;

      let hit = false;
      // Vs Boss
      if (this.#boss && this.#boss.state === 'FIGHTING') {
        if (Math.abs(b.x - this.#boss.x) < this.#boss.width / 2 && Math.abs(b.y - this.#boss.y) < this.#boss.height / 2) {
          hit = true;
          this.#boss.hp--;
          this.#boss.hitFlash = 0.05;
          if (this.#boss.hp === 15 && this.#boss.cracks.length === 0) {
            // Generate cracks
            for(let c=0; c<4; c++) {
              this.#boss.cracks.push({
                x: (Math.random() - 0.5) * this.#boss.width,
                y: (Math.random() - 0.5) * this.#boss.height,
                paths: Array.from({length: 4}, () => ({dx: (Math.random()-0.5)*30, dy: (Math.random()-0.5)*30}))
              });
            }
          }
          if (this.#boss.hp <= 0) {
            this.#boss.state = 'DYING';
            this.#boss.hp = 0;
          }
        }
      }
      
      // Vs Enemies
      if (!hit) {
        for (let j = this.#enemies.length - 1; j >= 0; j--) {
          const e = this.#enemies[j];
          if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.w / 2) {
            hit = true;
            e.hp--;
            if (e.hp <= 0) {
              this.#createExplosion(e.x, e.y, 15);
              let pts = 10;
              if (e.type === 'medium') pts = 25;
              if (e.type === 'large') pts = 50;
              this.#addScore(pts);
              this.#enemiesKilled++;

              if (e.type === 'large' && Math.random() < 0.3) {
                this.#powerups.push({
                  x: e.x, y: e.y,
                  type: Math.random() < 0.5 ? 'shield' : 'triple'
                });
              }
              this.#enemies.splice(j, 1);
            }
            break;
          }
        }
      }

      if (hit) {
        this.#bullets.splice(i, 1);
        continue;
      }

      // Vs Enemy Bullets / Homing Missiles (Shoot down enemy missiles!)
      for (let k = this.#bullets.length - 1; k >= 0; k--) {
        const eb = this.#bullets[k];
        if (eb.type === 'player' || eb === b) continue;

        const ebw = eb.w || (eb.r ? eb.r * 2 : 10);
        const ebh = eb.h || (eb.r ? eb.r * 2 : 10);
        if (Math.abs(b.x - eb.x) < (ebw / 2 + 8) && Math.abs(b.y - eb.y) < (ebh / 2 + 8)) {
          hit = true;
          this.#createParticle(eb.x, eb.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#ef4444', 0.4, 3);
          this.#createParticle(eb.x, eb.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#facc15', 0.4, 2);
          this.#addScore(5);
          this.#bullets.splice(k, 1);
          break;
        }
      }

      if (hit) {
        this.#bullets.splice(i, 1);
      }
    }

    // Player vs Enemy Bullets / Enemies / Boss
    if (this.#player.invulnerableTimer <= 0) {
      let playerHit = false;

      // Bullets
      for (let i = 0; i < this.#bullets.length; i++) {
        const b = this.#bullets[i];
        if (b.type !== 'player') {
          const bw = b.w || (b.r ? b.r*2 : 6);
          const bh = b.h || (b.r ? b.r*2 : 6);
          if (Math.abs(b.x - this.#player.x) < (bw/2 + 10) && Math.abs(b.y - this.#player.y) < (bh/2 + 15)) {
            playerHit = true;
            this.#bullets.splice(i, 1);
            break;
          }
        }
      }

      // Enemies
      if (!playerHit) {
        for (const e of this.#enemies) {
          if (Math.abs(e.x - this.#player.x) < (e.w/2 + 10) && Math.abs(e.y - this.#player.y) < (e.w/2 + 15)) {
            playerHit = true;
            break;
          }
        }
      }

      // Boss body and beam
      if (!playerHit && this.#boss && this.#boss.state === 'FIGHTING') {
        if (Math.abs(this.#boss.x - this.#player.x) < this.#boss.width/2 && Math.abs(this.#boss.y - this.#player.y) < this.#boss.height/2) {
          playerHit = true;
        }
        if (!playerHit && this.#boss.beamState === 'firing') {
          if (Math.abs(this.#boss.beamX - this.#player.x) < 5 + 10 && this.#player.y > this.#boss.y) {
            playerHit = true;
          }
        }
      }

      if (playerHit) {
        if (this.#player.powerupType === 'shield') {
          this.#player.powerupType = null;
          this.#player.powerupTimer = 0;
          this.#player.invulnerableTimer = 2.0;
          this.#shakeAmount = 5;
        } else {
          this.#lives--;
          this.#callbacks.onStateChange?.();
          this.#shakeAmount = 15;
          this.#createExplosion(this.#player.x, this.#player.y, 30);
          if (this.#lives <= 0) {
            this.#state = 'GAMEOVER';
            if (this.#callbacks.onGameOver) this.#callbacks.onGameOver(this.#score);
          } else {
            this.#player.invulnerableTimer = 2.0;
            this.#player.powerupType = null;
            this.#player.powerupTimer = 0;
          }
        }
      }
    }

    // Player vs Powerups
    for (let i = this.#powerups.length - 1; i >= 0; i--) {
      const p = this.#powerups[i];
      if (Math.abs(p.x - this.#player.x) < 20 && Math.abs(p.y - this.#player.y) < 25) {
        this.#player.powerupType = p.type;
        this.#player.powerupTimer = p.type === 'shield' ? 3.0 : 5.0;
        this.#powerups.splice(i, 1);
      }
    }
  }

  #addScore(pts) {
    this.#score += pts;
    if (this.#callbacks.onScoreChange) this.#callbacks.onScoreChange(this.#score);
  }

  #draw() {
    this.#ctx.save();
    
    // Screen shake
    if (this.#shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * 2 * this.#shakeAmount;
      const sy = (Math.random() - 0.5) * 2 * this.#shakeAmount;
      this.#ctx.translate(sx, sy);
    }

    // BG
    this.#ctx.fillStyle = '#0a0a1a';
    this.#ctx.fillRect(0, 0, this.#width, this.#height);

    // Nebulae
    this.#ctx.globalCompositeOperation = 'screen';
    for (const n of this.#nebulae) {
      const grad = this.#ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      grad.addColorStop(0, n.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      this.#ctx.fillStyle = grad;
      this.#ctx.beginPath();
      this.#ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      this.#ctx.fill();
    }
    this.#ctx.globalCompositeOperation = 'source-over';

    // Stars
    for (const s of this.#stars) {
      this.#ctx.globalAlpha = s.opacity;
      this.#ctx.fillStyle = s.type === 'mid' ? '#e0f7fa' : '#ffffff';
      if (s.type === 'near') {
        this.#ctx.shadowBlur = 4;
        this.#ctx.shadowColor = '#ffffff';
      } else {
        this.#ctx.shadowBlur = 0;
      }
      this.#ctx.beginPath();
      this.#ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      this.#ctx.fill();
    }
    this.#ctx.globalAlpha = 1.0;
    this.#ctx.shadowBlur = 0;

    // Bullets
    for (const b of this.#bullets) {
      this.#ctx.beginPath();
      if (b.type === 'player') {
        this.#ctx.fillStyle = '#00ffff';
        this.#ctx.shadowBlur = 8;
        this.#ctx.shadowColor = '#00ffff';
        this.#ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
      } else if (b.type === 'enemy' || b.type === 'bombfrag') {
        this.#ctx.fillStyle = b.type === 'bombfrag' ? '#ffff00' : '#ff4444';
        this.#ctx.shadowBlur = 6;
        this.#ctx.shadowColor = b.type === 'bombfrag' ? '#ffff00' : '#ff4444';
        this.#ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        this.#ctx.fill();
      } else if (b.type === 'boss') {
        this.#ctx.fillStyle = '#ffaa00';
        this.#ctx.shadowBlur = 8;
        this.#ctx.shadowColor = '#ffaa00';
        this.#ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        this.#ctx.fill();
      } else if (b.type === 'spiral') {
        this.#ctx.fillStyle = '#d946ef';
        this.#ctx.shadowBlur = 6;
        this.#ctx.shadowColor = '#d946ef';
        this.#ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        this.#ctx.fill();
      } else if (b.type === 'homing') {
        this.#ctx.save();
        this.#ctx.translate(b.x, b.y);
        this.#ctx.rotate(Math.atan2(b.vy, b.vx));
        this.#ctx.fillStyle = '#ff4444';
        this.#ctx.shadowBlur = 4;
        this.#ctx.shadowColor = '#ff4444';
        this.#ctx.fillRect(-b.h/2, -b.w/2, b.h, b.w);
        this.#ctx.restore();
      } else if (b.type === 'bomb') {
        this.#ctx.fillStyle = '#ff8800';
        this.#ctx.shadowBlur = 10;
        this.#ctx.shadowColor = '#ff8800';
        this.#ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        this.#ctx.fill();
      } else if (b.type === 'wave') {
        this.#ctx.save();
        this.#ctx.translate(b.x, b.y);
        this.#ctx.rotate(Math.atan2(b.vy, b.vx));
        this.#ctx.fillStyle = '#00ffff';
        this.#ctx.shadowBlur = 6;
        this.#ctx.shadowColor = '#00ffff';
        this.#ctx.fillRect(-b.h/2, -b.w/2, b.h, b.w);
        this.#ctx.restore();
      }
    }
    this.#ctx.shadowBlur = 0;

    // Enemies
    for (const e of this.#enemies) {
      this.#ctx.save();
      this.#ctx.translate(e.x, e.y);
      if (e.type === 'small') {
        this.#ctx.rotate(e.time * 2);
        this.#ctx.fillStyle = '#ff6b6b';
        this.#ctx.beginPath();
        this.#ctx.moveTo(0, -e.w/2);
        this.#ctx.lineTo(e.w/2, 0);
        this.#ctx.lineTo(0, e.w/2);
        this.#ctx.lineTo(-e.w/2, 0);
        this.#ctx.closePath();
        this.#ctx.fill();
      } else if (e.type === 'medium') {
        this.#ctx.fillStyle = '#d946ef';
        this.#ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI/2;
          const r = e.w/2;
          if (i===0) this.#ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
          else this.#ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
        }
        this.#ctx.closePath();
        this.#ctx.fill();
        this.#ctx.fillStyle = '#ffffff';
        this.#ctx.beginPath();
        this.#ctx.arc(0, 0, 3, 0, Math.PI*2);
        this.#ctx.fill();
      } else if (e.type === 'large') {
        this.#ctx.fillStyle = '#991b1b';
        this.#ctx.strokeStyle = '#ff4444';
        this.#ctx.lineWidth = 2;
        this.#ctx.shadowBlur = 10;
        this.#ctx.shadowColor = '#ff4444';
        this.#ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6;
          const r = e.w/2;
          if (i===0) this.#ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
          else this.#ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
        }
        this.#ctx.closePath();
        this.#ctx.fill();
        this.#ctx.stroke();
      }
      this.#ctx.restore();
    }

    // Boss
    if (this.#boss) {
      const b = this.#boss;
      this.#ctx.save();
      this.#ctx.translate(b.x, b.y);

      if (b.hitFlash > 0) {
        this.#ctx.fillStyle = 'white';
      } else {
        const grad = this.#ctx.createLinearGradient(0, -b.height / 2, 0, b.height / 2);
        if (b.type === 1) {
          grad.addColorStop(0, '#065f46');
          grad.addColorStop(1, '#0891b2');
        } else if (b.type === 2) {
          grad.addColorStop(0, '#4c1d95');
          grad.addColorStop(1, '#7e22ce');
        } else {
          grad.addColorStop(0, '#7f1d1d');
          grad.addColorStop(1, '#c2410c');
        }
        this.#ctx.fillStyle = grad;
      }

      if (b.type === 1) {
        // CHEFÃO 1: Hexagonal Alien Disk (FÁCIL)
        this.#ctx.strokeStyle = '#22d3ee';
        this.#ctx.lineWidth = 2.5;
        this.#ctx.shadowBlur = 10;
        this.#ctx.shadowColor = '#22d3ee';

        this.#ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6;
          const rx = b.width / 2;
          const ry = b.height / 2;
          if (i === 0) this.#ctx.moveTo(Math.cos(a) * rx, Math.sin(a) * ry);
          else this.#ctx.lineTo(Math.cos(a) * rx, Math.sin(a) * ry);
        }
        this.#ctx.closePath();
        this.#ctx.fill();
        this.#ctx.stroke();

        // Core 1
        if (b.hitFlash <= 0) {
          const pulse = 1 + Math.sin(b.time * 6) * 0.2;
          this.#ctx.fillStyle = '#06b6d4';
          this.#ctx.beginPath();
          this.#ctx.arc(0, 0, 12 * pulse, 0, Math.PI * 2);
          this.#ctx.fill();
        }
      } else if (b.type === 2) {
        // CHEFÃO 2: Spiked Star Destroyer (MÉDIO)
        this.#ctx.strokeStyle = '#facc15';
        this.#ctx.lineWidth = 2.5;
        this.#ctx.shadowBlur = 12;
        this.#ctx.shadowColor = '#facc15';

        this.#ctx.beginPath();
        this.#ctx.moveTo(0, b.height / 2);
        this.#ctx.lineTo(b.width / 4, 0);
        this.#ctx.lineTo(b.width / 2, -b.height / 3);
        this.#ctx.lineTo(b.width / 3, -b.height / 2);
        this.#ctx.lineTo(0, -b.height / 4);
        this.#ctx.lineTo(-b.width / 3, -b.height / 2);
        this.#ctx.lineTo(-b.width / 2, -b.height / 3);
        this.#ctx.lineTo(-b.width / 4, 0);
        this.#ctx.closePath();
        this.#ctx.fill();
        this.#ctx.stroke();

        // Core 2
        if (b.hitFlash <= 0) {
          const pulse = 1 + Math.sin(b.time * 7) * 0.25;
          this.#ctx.fillStyle = '#facc15';
          this.#ctx.beginPath();
          this.#ctx.arc(0, 0, 14 * pulse, 0, Math.PI * 2);
          this.#ctx.fill();
        }
      } else {
        // CHEFÃO 3: Imperial Dreadnought (DIFÍCIL)
        this.#ctx.strokeStyle = '#ef4444';
        this.#ctx.lineWidth = 3;
        this.#ctx.shadowBlur = 15;
        this.#ctx.shadowColor = '#ef4444';

        this.#ctx.beginPath();
        this.#ctx.moveTo(0, -b.height / 2);
        this.#ctx.lineTo(b.width / 2, b.height / 4);
        this.#ctx.lineTo(b.width / 3, b.height / 2);
        this.#ctx.lineTo(0, b.height / 3);
        this.#ctx.lineTo(-b.width / 3, b.height / 2);
        this.#ctx.lineTo(-b.width / 2, b.height / 4);
        this.#ctx.closePath();
        this.#ctx.fill();
        this.#ctx.stroke();

        // Core 3 (Fire Pulsing)
        if (b.hitFlash <= 0) {
          const pulse = 1 + Math.sin(b.time * 8) * 0.3;
          this.#ctx.fillStyle = '#ef4444';
          this.#ctx.beginPath();
          this.#ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
          this.#ctx.fill();
        }
      }

      // Cracks
      if (b.cracks && b.cracks.length > 0 && b.hitFlash <= 0) {
        this.#ctx.strokeStyle = 'rgba(255,100,0,0.7)';
        this.#ctx.lineWidth = 2;
        for (const crack of b.cracks) {
          this.#ctx.beginPath();
          this.#ctx.moveTo(crack.x, crack.y);
          let cx = crack.x, cy = crack.y;
          for (const p of crack.paths) {
            cx += p.dx; cy += p.dy;
            this.#ctx.lineTo(cx, cy);
          }
          this.#ctx.stroke();
        }
      }

      // Boss Beam
      if (b.beamState === 'charging') {
        this.#ctx.strokeStyle = (Math.random() < 0.5) ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 100, 100, 0.5)';
        this.#ctx.lineWidth = 2;
        this.#ctx.beginPath();
        this.#ctx.moveTo(0, b.height / 2);
        this.#ctx.lineTo(0, this.#height);
        this.#ctx.stroke();
      } else if (b.beamState === 'firing') {
        const pulse = 8 + Math.random() * 12;
        this.#ctx.shadowBlur = pulse;
        this.#ctx.shadowColor = '#ff0000';
        this.#ctx.strokeStyle = '#ef4444';
        this.#ctx.lineWidth = 14;
        this.#ctx.beginPath();
        this.#ctx.moveTo(0, b.height / 2);
        this.#ctx.lineTo(0, this.#height);
        this.#ctx.stroke();
      }

      this.#ctx.restore();

      // Boss HP bar & Title
      if (b.state === 'FIGHTING') {
        const barW = this.#width * 0.65;
        const barH = 8;
        const barX = this.#width / 2 - barW / 2;
        const barY = b.y - b.height / 2 - 20;

        // Title Text
        this.#ctx.save();
        this.#ctx.fillStyle = '#ffffff';
        this.#ctx.font = 'bold 11px Fredoka, sans-serif';
        this.#ctx.textAlign = 'center';
        this.#ctx.shadowColor = '#000000';
        this.#ctx.shadowBlur = 4;
        this.#ctx.fillText(b.name, this.#width / 2, barY - 4);
        this.#ctx.restore();

        this.#ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.#ctx.fillRect(barX, barY, barW, barH);

        const hpPct = Math.max(0, b.hp / b.maxHp);
        if (hpPct > 0) {
          const hpGrad = this.#ctx.createLinearGradient(barX, 0, barX + barW, 0);
          if (b.type === 1) {
            hpGrad.addColorStop(0, '#06b6d4');
            hpGrad.addColorStop(1, '#22c55e');
          } else if (b.type === 2) {
            hpGrad.addColorStop(0, '#a855f7');
            hpGrad.addColorStop(1, '#facc15');
          } else {
            hpGrad.addColorStop(0, '#ef4444');
            hpGrad.addColorStop(1, '#ff8800');
          }
          this.#ctx.fillStyle = hpGrad;
          this.#ctx.fillRect(barX, barY, barW * hpPct, barH);
        }

        this.#ctx.strokeStyle = '#ffffff';
        this.#ctx.lineWidth = 1;
        this.#ctx.strokeRect(barX, barY, barW, barH);
      }
    }

    // Wave Banner Notification
    if (this.#waveMessageTimer > 0 && this.#waveMessage) {
      this.#ctx.save();
      this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      this.#ctx.fillRect(0, this.#height * 0.4 - 25, this.#width, 50);

      this.#ctx.fillStyle = '#facc15';
      this.#ctx.font = 'bold 18px Fredoka, sans-serif';
      this.#ctx.textAlign = 'center';
      this.#ctx.textBaseline = 'middle';
      this.#ctx.shadowColor = '#facc15';
      this.#ctx.shadowBlur = 12;
      this.#ctx.fillText(this.#waveMessage, this.#width / 2, this.#height * 0.4);
      this.#ctx.restore();
    }

    // Powerups
    for (const p of this.#powerups) {
      this.#ctx.save();
      this.#ctx.translate(p.x, p.y);
      this.#ctx.shadowBlur = 10;
      if (p.type === 'shield') {
        this.#ctx.shadowColor = '#ffff00';
        this.#ctx.fillStyle = '#ffff00';
        this.#ctx.beginPath();
        this.#ctx.arc(0, 0, 8, 0, Math.PI*2);
        this.#ctx.fill();
        this.#ctx.fillStyle = '#000';
        this.#ctx.font = '10px Arial';
        this.#ctx.textAlign = 'center';
        this.#ctx.textBaseline = 'middle';
        this.#ctx.fillText('⚡', 0, 0);
      } else {
        this.#ctx.shadowColor = '#0088ff';
        this.#ctx.fillStyle = '#0088ff';
        this.#ctx.beginPath();
        this.#ctx.arc(0, 0, 8, 0, Math.PI*2);
        this.#ctx.fill();
        this.#ctx.fillStyle = '#fff';
        this.#ctx.font = '10px Arial';
        this.#ctx.textAlign = 'center';
        this.#ctx.textBaseline = 'middle';
        this.#ctx.fillText('🔱', 0, 0);
      }
      this.#ctx.restore();
    }

    // Particles
    for (const p of this.#particles) {
      this.#ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      this.#ctx.fillStyle = p.color;
      this.#ctx.beginPath();
      this.#ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      this.#ctx.fill();
    }
    this.#ctx.globalAlpha = 1.0;

    // Player
    if (this.#state !== 'GAMEOVER') {
      const p = this.#player;
      let drawPlayer = true;
      if (p.invulnerableTimer > 0) {
        if (Math.floor(p.invulnerableTimer * 30) % 2 === 0) {
          drawPlayer = false;
        }
      }
      
      if (drawPlayer) {
        this.#ctx.save();
        this.#ctx.translate(p.x, p.y);
        
        // Shield visual
        if (p.powerupType === 'shield') {
          this.#ctx.beginPath();
          this.#ctx.arc(0, 0, p.height, 0, Math.PI*2);
          this.#ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
          this.#ctx.fill();
          this.#ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
          this.#ctx.lineWidth = 2;
          this.#ctx.stroke();
        }

        const grad = this.#ctx.createLinearGradient(0, -p.height/2, 0, p.height/2);
        grad.addColorStop(0, '#4a9eff');
        grad.addColorStop(1, '#1a3a6e');
        
        this.#ctx.fillStyle = grad;
        this.#ctx.beginPath();
        this.#ctx.moveTo(0, -p.height/2);
        this.#ctx.lineTo(p.width/2, p.height/2);
        this.#ctx.lineTo(-p.width/2, p.height/2);
        this.#ctx.closePath();
        this.#ctx.fill();

        // Cockpit
        this.#ctx.fillStyle = '#00ffff';
        this.#ctx.shadowBlur = 5;
        this.#ctx.shadowColor = '#00ffff';
        this.#ctx.beginPath();
        this.#ctx.arc(0, -p.height * 0.2, 4, 0, Math.PI*2);
        this.#ctx.fill();
        this.#ctx.shadowBlur = 0;

        // Engine flames
        this.#ctx.fillStyle = '#ffaa00';
        const flameLen = 5 + Math.random() * 5;
        this.#ctx.beginPath();
        this.#ctx.moveTo(-5, p.height/2);
        this.#ctx.lineTo(-2, p.height/2 + flameLen);
        this.#ctx.lineTo(0, p.height/2);
        this.#ctx.fill();
        this.#ctx.beginPath();
        this.#ctx.moveTo(5, p.height/2);
        this.#ctx.lineTo(2, p.height/2 + flameLen);
        this.#ctx.lineTo(0, p.height/2);
        this.#ctx.fill();

        this.#ctx.restore();
      }
    }

    // UI
    this.#ctx.fillStyle = 'white';
    this.#ctx.font = 'bold 18px sans-serif';
    this.#ctx.textAlign = 'left';
    this.#ctx.textBaseline = 'top';
    this.#ctx.shadowBlur = 2;
    this.#ctx.shadowColor = 'black';
    this.#ctx.fillText(`⭐ ${this.#score}`, 10, 10);

    this.#ctx.textAlign = 'right';
    let hearts = '';
    for(let i=0; i<3; i++) hearts += i < this.#lives ? '❤️ ' : '💔 ';
    this.#ctx.fillText(hearts, this.#width - 10, 10);
    this.#ctx.shadowBlur = 0;

    // Powerup UI
    if (this.#player && this.#player.powerupType) {
      this.#ctx.fillStyle = 'white';
      this.#ctx.font = '14px sans-serif';
      this.#ctx.textAlign = 'center';
      const icon = this.#player.powerupType === 'shield' ? '⚡' : '🔱';
      this.#ctx.fillText(icon, this.#width/2, this.#height - 30);
      
      const maxT = this.#player.powerupType === 'shield' ? 3.0 : 5.0;
      const pct = this.#player.powerupTimer / maxT;
      this.#ctx.fillStyle = 'rgba(255,255,255,0.3)';
      this.#ctx.fillRect(this.#width/2 - 20, this.#height - 15, 40, 4);
      this.#ctx.fillStyle = this.#player.powerupType === 'shield' ? '#ffff00' : '#0088ff';
      this.#ctx.fillRect(this.#width/2 - 20, this.#height - 15, 40 * pct, 4);
    }

    // Boss death flash
    if (this.#state === 'VICTORY' && this.#bossKilledTime < 0.3) {
      this.#ctx.fillStyle = `rgba(255, 255, 255, ${1 - (this.#bossKilledTime/0.3)})`;
      this.#ctx.fillRect(0, 0, this.#width, this.#height);
    }

    // Victory text
    if (this.#state === 'VICTORY' && this.#bossKilledTime >= 0.3) {
      this.#ctx.save();
      this.#ctx.translate(this.#width/2, this.#height/2);
      const scale = 1 + Math.sin(this.#bossKilledTime * 5) * 0.1;
      this.#ctx.scale(scale, scale);
      this.#ctx.fillStyle = '#ffd700';
      this.#ctx.shadowBlur = 20;
      this.#ctx.shadowColor = '#ffd700';
      this.#ctx.font = 'bold 42px sans-serif';
      this.#ctx.textAlign = 'center';
      this.#ctx.textBaseline = 'middle';
      this.#ctx.fillText('VITÓRIA!', 0, 0);
      this.#ctx.restore();
    }

    // Game Over
    if (this.#state === 'GAMEOVER') {
      this.#ctx.fillStyle = 'rgba(0,0,0,0.8)';
      this.#ctx.fillRect(0, 0, this.#width, this.#height);
      this.#ctx.fillStyle = 'white';
      this.#ctx.textAlign = 'center';
      this.#ctx.textBaseline = 'middle';
      this.#ctx.font = 'bold 36px sans-serif';
      this.#ctx.fillText('GAME OVER', this.#width/2, this.#height/2 - 20);
      this.#ctx.font = '18px sans-serif';
      this.#ctx.fillText(`Score: ${this.#score}`, this.#width/2, this.#height/2 + 20);
      this.#ctx.font = '16px sans-serif';
      this.#ctx.fillText('Pressione qualquer botão', this.#width/2, this.#height/2 + 60);
    }

    this.#ctx.restore();
  }
}
