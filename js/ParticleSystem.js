/* ===========================================
   ParticleSystem — Shared Particle Engine
   Reusable across all games
   =========================================== */

export class Particle {
  /** @type {number} */ x;
  /** @type {number} */ y;
  /** @type {number} */ vx;
  /** @type {number} */ vy;
  /** @type {number} */ life;
  /** @type {number} */ maxLife;
  /** @type {number} */ radius;
  /** @type {string} */ color;
  /** @type {number} */ decay;

  constructor(x, y, vx, vy, radius, color, life = 60) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.decay = 0.96;
  }

  get alive() {
    return this.life > 0;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.decay;
    this.vy *= this.decay;
    this.radius *= 0.99;
    this.life--;
  }
}

export default class ParticleSystem {
  #particles = [];
  #ctx;
  #maxParticles;

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} [maxParticles=500]
   */
  constructor(ctx, maxParticles = 500) {
    this.#ctx = ctx;
    this.#maxParticles = maxParticles;
  }

  get count() {
    return this.#particles.length;
  }

  /**
   * Emit a burst of particles from a point
   * @param {number} x
   * @param {number} y
   * @param {Object} options
   */
  emit(x, y, {
    count = 10,
    speed = 3,
    radius = 3,
    colors = ['#ff4444', '#ff8800', '#ffcc00', '#ffffff'],
    life = 50,
    spread = Math.PI * 2,
    angle = 0,
    gravity = 0,
    decay = 0.96
  } = {}) {
    for (let i = 0; i < count; i++) {
      if (this.#particles.length >= this.#maxParticles) break;

      const dir = angle - spread / 2 + Math.random() * spread;
      const spd = speed * (0.5 + Math.random() * 0.5);
      const p = new Particle(
        x,
        y,
        Math.cos(dir) * spd,
        Math.sin(dir) * spd,
        radius * (0.5 + Math.random() * 0.5),
        colors[Math.floor(Math.random() * colors.length)],
        life + Math.floor(Math.random() * 20 - 10)
      );
      p.decay = decay;
      p.gravity = gravity;
      this.#particles.push(p);
    }
  }

  /**
   * Add a single custom particle
   * @param {Particle} particle
   */
  add(particle) {
    if (this.#particles.length < this.#maxParticles) {
      this.#particles.push(particle);
    }
  }

  update() {
    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const p = this.#particles[i];
      p.update();
      if (p.gravity) p.vy += p.gravity;
      if (!p.alive || p.radius < 0.1) {
        this.#particles.splice(i, 1);
      }
    }
  }

  render() {
    const ctx = this.#ctx;
    ctx.save();

    for (const p of this.#particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.radius * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  clear() {
    this.#particles.length = 0;
  }
}
