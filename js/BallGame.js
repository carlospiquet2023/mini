/* ===========================================
   BallGame — Original Ball Physics Game
   Adapted from Matter.js based original
   =========================================== */

export default class BallGame {
  #canvas;
  #ctx;
  #callbacks;
  #container;

  // Matter.js refs
  #engine;
  #render;
  #runner;
  #world;

  // Game state
  #balls = [];
  #holes = [];
  #boundaries = [];
  #bubbles = [];
  #shrinkAnimations = new Map();
  #score = 0;
  #buttonAPressed = false;
  #buttonBPressed = false;
  #W = 0;
  #H = 0;
  #active = false;
  #winTriggered = false;

  // Funny fish distractor state
  #fish = {
    active: false,
    x: -60,
    y: 100,
    dir: 1,
    speed: 2.5,
    timer: 0,
    nextSpawn: 3,
    talk: '',
    tailAnim: 0
  };

  // Constants
  static NUM_BALLS = 12;
  static BALL_COLORS = [
    '#ef4444', '#3b82f6', '#22c55e', '#f59e0b',
    '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
    '#06b6d4', '#eab308', '#a855f7', '#f43f5e'
  ];

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} callbacks
   */
  constructor(canvas, ctx, callbacks) {
    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#callbacks = callbacks;
    this.#container = canvas.parentElement;
  }

  start() {
    if (this.#active) return;
    this.#active = true;

    const { Engine, Render, Runner, Events } = Matter;

    if (this.#engine) {
      this.#runner = Runner.run(this.#engine);
      Render.run(this.#render);
      return;
    }

    // Resize canvas
    const size = this.#resizeCanvas();
    this.#W = size.width;
    this.#H = size.height;

    // Create physics engine
    this.#engine = Engine.create();
    this.#world = this.#engine.world;
    this.#world.gravity.y = 0.5;

    // Create renderer
    this.#render = Render.create({
      element: this.#container,
      engine: this.#engine,
      canvas: this.#canvas,
      options: {
        width: this.#W,
        height: this.#H,
        wireframes: false,
        background: 'transparent'
      }
    });
    this.#configureRender();

    this.#canvas.style.backgroundColor = 'transparent';

    // Setup game elements
    this.#setupGame();

    // Physics loop
    Events.on(this.#engine, 'beforeUpdate', () => {
      if (!this.#active) return;

      this.#limitBallSpeed();

      if (this.#buttonAPressed) this.#jetAir(this.#W * 0.25);
      if (this.#buttonBPressed) this.#jetAir(this.#W * 0.75);

      this.#updateFish();
      this.#checkWinCondition();
    });

    // Render loop (bubbles and fish)
    Events.on(this.#render, 'afterRender', () => {
      if (!this.#active) return;
      this.#updateAndDrawBubbles();
      this.#drawFish();
    });

    // Start
    this.#runner = Runner.run(this.#engine);
    Render.run(this.#render);
  }

  stop() {
    if (!this.#active) return;
    this.#active = false;
    this.#buttonAPressed = false;
    this.#buttonBPressed = false;
    this.#clearShrinkAnimations();

    const { Runner, Render } = Matter;

    if (this.#runner) Runner.stop(this.#runner);
    if (this.#render) Render.stop(this.#render);
  }

  restart() {
    const { World } = Matter;
    this.#clearShrinkAnimations();
    World.clear(this.#world);
    this.#balls = [];
    this.#holes = [];
    this.#boundaries = [];
    this.#bubbles = [];
    this.#score = 0;
    this.#winTriggered = false;
    this.#fish.active = false;
    this.#fish.timer = 0;
    this.#fish.nextSpawn = 3;
    this.#callbacks.onScoreChange?.(0);
    this.#callbacks.onWinHide?.();
    this.#setupGame();
  }

  resize(width, height) {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (nextWidth === this.#W && nextHeight === this.#H) return;

    const oldWidth = this.#W || nextWidth;
    const oldHeight = this.#H || nextHeight;
    this.#W = nextWidth;
    this.#H = nextHeight;
    this.#canvas.style.width = `${nextWidth}px`;
    this.#canvas.style.height = `${nextHeight}px`;

    if (!this.#engine) return;

    const { Body, World } = Matter;
    const scaleX = nextWidth / oldWidth;
    const scaleY = nextHeight / oldHeight;

    this.#clearShrinkAnimations();
    for (const ball of this.#balls) {
      if (ball.isScored) continue;
      const radius = ball.circleRadius || 16;
      Body.setPosition(ball, {
        x: Math.max(radius, Math.min(nextWidth - radius, ball.position.x * scaleX)),
        y: Math.max(radius, Math.min(nextHeight - radius, ball.position.y * scaleY))
      });
      Body.setVelocity(ball, {
        x: ball.velocity.x * Math.min(scaleX, 1.25),
        y: ball.velocity.y * Math.min(scaleY, 1.25)
      });
    }

    this.#bubbles = this.#bubbles.map((bubble) => ({
      ...bubble,
      x: bubble.x * scaleX,
      y: bubble.y * scaleY
    }));
    this.#fish.x *= scaleX;
    this.#fish.y *= scaleY;

    World.remove(this.#world, this.#boundaries);
    for (const hole of this.#holes) World.remove(this.#world, [hole.body, hole.sensor]);
    this.#boundaries = [];
    this.#holes = [];
    this.#setupArena();
    this.#configureRender();
  }

  onButtonADown() {
    this.#buttonAPressed = true;
    this.#jetAir(this.#W * 0.25);
  }
  onButtonAUp() {
    this.#buttonAPressed = false;
  }
  onButtonBDown() {
    this.#buttonBPressed = true;
    this.#jetAir(this.#W * 0.75);
  }
  onButtonBUp() {
    this.#buttonBPressed = false;
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  #resizeCanvas() {
    const rect = this.#container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.#canvas.style.width = `${width}px`;
    this.#canvas.style.height = `${height}px`;
    return { width, height };
  }

  #configureRender() {
    if (!this.#render) return;
    const { Render } = Matter;
    this.#render.options.width = this.#W;
    this.#render.options.height = this.#H;
    this.#render.bounds.max.x = this.#W;
    this.#render.bounds.max.y = this.#H;
    Render.setPixelRatio(this.#render, Math.min(window.devicePixelRatio || 1, 2));
  }

  #setupGame() {
    const { Bodies, World, Common } = Matter;
    const W = this.#W;
    const H = this.#H;

    this.#setupArena();

    // Balls
    const ballRadius = 16;
    for (let i = 0; i < BallGame.NUM_BALLS; i++) {
      const x = Common.random(W * 0.1, W * 0.9);
      const y = H - Common.random(30, 80);

      const ball = Bodies.circle(x, y, ballRadius, {
        label: 'ball',
        frictionAir: 0.08,
        friction: 0.1,
        restitution: 0.7,
        density: 0.0015,
        isScored: false,
        slop: 0.05,
        render: {
          fillStyle: BallGame.BALL_COLORS[i % BallGame.BALL_COLORS.length],
          strokeStyle: '#000',
          lineWidth: 2
        }
      });
      this.#balls.push(ball);
    }
    World.add(this.#world, this.#balls);
  }

  #setupArena() {
    const { Bodies, World } = Matter;
    const W = this.#W;
    const H = this.#H;

    // Extra thick solid walls & ceiling to prevent physics tunneling on mobile
    const wallOpts = { isStatic: true, restitution: 0.5, render: { visible: false } };

    this.#boundaries = [
      // Floor (bottom)
      Bodies.rectangle(W / 2, H + 75, W + 300, 150, wallOpts),
      // Ceiling (top)
      Bodies.rectangle(W / 2, -75, W + 300, 150, wallOpts),
      // Left Wall
      Bodies.rectangle(-75, H / 2, 150, H + 300, wallOpts),
      // Right Wall
      Bodies.rectangle(W + 75, H / 2, 150, H + 300, wallOpts),
    ];
    World.add(this.#world, this.#boundaries);

    // Holes
    const holeRadius = 22;
    const holeY = H * 0.15;
    const holeSpacing = W * 0.25;

    const createHole = (x) => {
      const visual = Bodies.circle(x, holeY, holeRadius, {
        isStatic: true, isSensor: true, label: 'hole-visual',
        render: { fillStyle: '#000000', strokeStyle: '#1e293b', lineWidth: 5 }
      });
      const sensor = Bodies.circle(x, holeY, holeRadius + 3, {
        isStatic: true, isSensor: true, label: 'hole-sensor',
        render: { visible: false }
      });
      World.add(this.#world, [visual, sensor]);
      return { body: visual, sensor, scoredBalls: 0, cooldown: 0, x, y: holeY };
    };

    this.#holes.push(createHole(holeSpacing));
    this.#holes.push(createHole(W - holeSpacing));
  }

  #jetAir(originX) {
    const { Body, Common } = Matter;
    const forceMag = -0.05 * (this.#W / 400);
    const jetRadius = this.#W * 0.45;

    for (const ball of this.#balls) {
      if (ball.isScored) continue;
      const dist = Math.abs(ball.position.x - originX);
      if (dist < jetRadius) {
        const scale = 1 - dist / jetRadius;
        Body.applyForce(ball, ball.position, {
          x: Common.random(-0.012, 0.012) * scale,
          y: forceMag * scale
        });
        Body.setAngularVelocity(ball, Common.random(-0.15, 0.15));
      }
    }
    this.#spawnBubbles(originX);
  }

  #spawnBubbles(x) {
    const { Common } = Matter;
    const count = Common.random(15, 25);
    for (let i = 0; i < count; i++) {
      this.#bubbles.push({
        x: x + Common.random(-20, 20),
        y: this.#H - Common.random(10, 30),
        r: Common.random(1, 5),
        opacity: 1,
        speed: Common.random(2, 5)
      });
    }
  }

  #updateAndDrawBubbles() {
    const ctx = this.#ctx;
    const { Common } = Matter;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowColor = 'rgba(255, 255, 255, 1)';
    ctx.shadowBlur = 10;

    for (let i = this.#bubbles.length - 1; i >= 0; i--) {
      const b = this.#bubbles[i];
      b.y -= b.speed;
      b.x += Common.random(-0.5, 0.5);
      b.opacity -= 0.01;

      if (b.opacity <= 0) {
        this.#bubbles.splice(i, 1);
      } else {
        ctx.globalAlpha = b.opacity;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  #updateFish() {
    const { Body, Common } = Matter;
    const fish = this.#fish;

    if (!fish.active) {
      fish.timer += 0.016;
      if (fish.timer >= fish.nextSpawn) {
        fish.active = true;
        fish.timer = 0;
        fish.nextSpawn = 6 + Math.random() * 8; // Next fish in 6-14s
        fish.dir = Math.random() < 0.5 ? 1 : -1;
        fish.x = fish.dir === 1 ? -60 : this.#W + 60;
        fish.y = this.#H * (0.12 + Math.random() * 0.2); // Near hole height
        fish.speed = 2 + Math.random() * 1.5;

        const quotes = ['Aqui não! 🐟', 'Sai fora! 💨', 'Glub Glub! 🐡', 'Minha área! 🚫', 'Tchau bola! 🐠'];
        fish.talk = quotes[Math.floor(Math.random() * quotes.length)];
      }
      return;
    }

    // Move fish
    fish.x += fish.dir * fish.speed;
    fish.tailAnim += 0.25;

    // Check collision with balls to push/slap them away with velocity!
    for (const ball of this.#balls) {
      if (ball.isScored) continue;

      const dx = ball.position.x - fish.x;
      const dy = ball.position.y - fish.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 55) {
        // High impact tail slap! Set velocity directly so the ball flies away!
        const dirX = dx / (dist || 1);
        const dirY = dy / (dist || 1);
        Body.setVelocity(ball, {
          x: fish.dir * (6 + Math.random() * 4) + dirX * 3,
          y: -4 - Math.random() * 4 + dirY * 2
        });
        Body.setAngularVelocity(ball, (Math.random() - 0.5) * 0.5);
      }
    }

    // Despawn fish off-screen
    if ((fish.dir === 1 && fish.x > this.#W + 80) || (fish.dir === -1 && fish.x < -80)) {
      fish.active = false;
    }
  }

  #drawFish() {
    const fish = this.#fish;

    // Draw filled hole status indicators
    this.#drawHoleStatus();

    if (!fish.active) return;

    const ctx = this.#ctx;
    ctx.save();
    ctx.translate(fish.x, fish.y);

    if (fish.dir === -1) {
      ctx.scale(-1, 1);
    }

    // Fish Tail animation
    const tailWiggle = Math.sin(fish.tailAnim) * 8;

    // Tail
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-32, -12 + tailWiggle);
    ctx.lineTo(-32, 12 + tailWiggle);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = '#ff8c42';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stripes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-4, 0, 10, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(6, 0, 8, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(14, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(15, -5, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Speech Bubble (unflipped)
    if (fish.talk) {
      ctx.save();
      ctx.font = 'bold 12px Fredoka, sans-serif';
      const textWidth = ctx.measureText(fish.talk).width;
      const bx = fish.x;
      const by = fish.y - 24;

      // Bubble background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.roundRect(bx - textWidth / 2 - 8, by - 14, textWidth + 16, 20, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Text
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fish.talk, bx, by - 4);
      ctx.restore();
    }
  }

  #drawHoleStatus() {
    const ctx = this.#ctx;
    for (const hole of this.#holes) {
      // Decrease cooldown timer
      if (hole.cooldown > 0) {
        hole.cooldown -= 0.016;

        // Visual indicator for busy/processing hole
        ctx.save();
        ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  #limitBallSpeed() {
    const { Body } = Matter;
    const maxSpeed = 12;

    for (const ball of this.#balls) {
      if (ball.isScored) continue;

      // Speed limiting
      const spd = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      if (spd > maxSpeed) {
        const s = maxSpeed / spd;
        Body.setVelocity(ball, { x: ball.velocity.x * s, y: ball.velocity.y * s });
      }

      // Hard Ceiling & Wall Boundaries Clamp (Prevents tunneling through ceiling on mobile!)
      const r = ball.circleRadius || 16;

      // Ceiling clamp (Y top edge)
      if (ball.position.y < r + 2) {
        Body.setPosition(ball, { x: ball.position.x, y: r + 2 });
        if (ball.velocity.y < 0) {
          Body.setVelocity(ball, { x: ball.velocity.x, y: Math.abs(ball.velocity.y) * 0.4 });
        }
      }
      // Floor clamp (Y bottom edge)
      if (ball.position.y > this.#H - r - 2) {
        Body.setPosition(ball, { x: ball.position.x, y: this.#H - r - 2 });
        if (ball.velocity.y > 0) {
          Body.setVelocity(ball, { x: ball.velocity.x, y: -Math.abs(ball.velocity.y) * 0.4 });
        }
      }
      // Left Wall clamp
      if (ball.position.x < r + 2) {
        Body.setPosition(ball, { x: r + 2, y: ball.position.y });
        if (ball.velocity.x < 0) {
          Body.setVelocity(ball, { x: Math.abs(ball.velocity.x) * 0.4, y: ball.velocity.y });
        }
      }
      // Right Wall clamp
      else if (ball.position.x > this.#W - r - 2) {
        Body.setPosition(ball, { x: this.#W - r - 2, y: ball.position.y });
        if (ball.velocity.x > 0) {
          Body.setVelocity(ball, { x: -Math.abs(ball.velocity.x) * 0.4, y: ball.velocity.y });
        }
      }
    }
  }

  #checkWinCondition() {
    const { Body } = Matter;

    for (const ball of this.#balls) {
      if (ball.isScored) continue;

      for (const hole of this.#holes) {
        // ONE AT A TIME RULE: If hole is currently in cooldown (just swallowed a ball), skip it!
        if (hole.cooldown && hole.cooldown > 0) continue;

        const dx = hole.x - ball.position.x;
        const dy = hole.y - ball.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const spd = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);

        // Gentle suction effect when ball is close to open hole
        if (dist < 26 && spd < 6.0) {
          Body.applyForce(ball, ball.position, {
            x: dx * 0.0003,
            y: dy * 0.0003
          });
        }

        // Hole capture condition (ONLY 1 BALL AT A TIME)
        if (dist < 20 && spd < 5.0) {
          ball.isScored = true;
          this.#animateBallIntoHole(ball, hole);

          // Set 1.2 second cooldown so no other ball can enter this hole at the same time!
          hole.cooldown = 1.2;
          hole.scoredBalls++;
          this.#score++;
          this.#callbacks.onScoreChange?.(this.#score);

          // WIN CONDITION: WIN WHEN ALL 12 BALLS ARE SCORED!
          if (this.#score >= BallGame.NUM_BALLS) {
            if (!this.#winTriggered) {
              this.#winTriggered = true;
              this.#callbacks.onWin?.();
            }
          }

          // Break loop for this ball so it doesn't trigger multiple holes
          break;
        }
      }
    }
  }

  #animateBallIntoHole(ball, hole) {
    const { Body, World } = Matter;
    let scale = 1;

    const shrink = setInterval(() => {
      scale -= 0.1;
      if (scale <= 0) {
        clearInterval(shrink);
        this.#shrinkAnimations.delete(shrink);
        World.remove(this.#world, ball);
      } else {
        Body.setPosition(ball, {
          x: ball.position.x + (hole.x - ball.position.x) * 0.2,
          y: ball.position.y + (hole.y - ball.position.y) * 0.2
        });
        Body.scale(ball, 0.9, 0.9);
      }
    }, 30);
    this.#shrinkAnimations.set(shrink, ball);
  }

  #clearShrinkAnimations() {
    if (!this.#world) return;
    const { World } = Matter;
    for (const [timer, ball] of this.#shrinkAnimations) {
      clearInterval(timer);
      World.remove(this.#world, ball);
    }
    this.#shrinkAnimations.clear();
  }
}
