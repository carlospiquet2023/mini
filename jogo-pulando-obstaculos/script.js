(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const ui = {
    lives: document.getElementById("livesValue"),
    score: document.getElementById("scoreValue"),
    coins: document.getElementById("coinsValue"),
    best: document.getElementById("bestValue"),
    startScreen: document.getElementById("startScreen"),
    pauseScreen: document.getElementById("pauseScreen"),
    gameOverScreen: document.getElementById("gameOverScreen"),
    startBtn: document.getElementById("startBtn"),
    restartBtn: document.getElementById("restartBtn"),
    resumeBtn: document.getElementById("resumeBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    pauseIcon: document.getElementById("pauseIcon"),
    jumpBtn: document.getElementById("jumpBtn"),
    finalScore: document.getElementById("finalScore"),
    finalCoins: document.getElementById("finalCoins"),
    finalMessage: document.getElementById("finalMessage"),
    gameArea: document.getElementById("gameArea")
  };

  const WORLD = {
    gravity: 2100,
    jumpForce: -780,
    baseSpeed: 360,
    maxSpeed: 700,
    groundRatio: 0.79
  };

  const state = {
    status: "start", // start | playing | paused | gameover
    score: 0,
    coins: 0,
    lives: 3,
    speed: WORLD.baseSpeed,
    distance: 0,
    spawnTimer: 0,
    nextSpawn: 1.25,
    coinTimer: 0,
    nextCoin: 0.85,
    lastTime: 0,
    elapsed: 0,
    shake: 0,
    flash: 0,
    best: Number(localStorage.getItem("superPuloBest") || 0)
  };

  const player = {
    x: 130,
    y: 0,
    width: 54,
    height: 68,
    vy: 0,
    grounded: true,
    invulnerable: 0,
    runFrame: 0
  };

  let obstacles = [];
  let coins = [];
  let particles = [];
  let clouds = [];
  let hills = [];

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createBackgroundObjects(rect.width, rect.height);
    if (state.status === "start") {
      placePlayerOnGround();
      draw();
    }
  }

  function width() {
    return canvas.getBoundingClientRect().width;
  }

  function height() {
    return canvas.getBoundingClientRect().height;
  }

  function groundY() {
    return height() * WORLD.groundRatio;
  }

  function placePlayerOnGround() {
    player.y = groundY() - player.height;
    player.vy = 0;
    player.grounded = true;
  }

  function createBackgroundObjects(w, h) {
    if (!clouds.length) {
      clouds = Array.from({ length: 7 }, (_, i) => ({
        x: (i / 7) * w + Math.random() * 120,
        y: 40 + Math.random() * h * 0.3,
        scale: 0.65 + Math.random() * 0.8,
        speed: 10 + Math.random() * 14
      }));
    }

    if (!hills.length) {
      hills = Array.from({ length: 9 }, (_, i) => ({
        x: i * 180,
        width: 190 + Math.random() * 120,
        height: 90 + Math.random() * 100
      }));
    }
  }

  function resetGame() {
    state.score = 0;
    state.coins = 0;
    state.lives = 3;
    state.speed = WORLD.baseSpeed;
    state.distance = 0;
    state.spawnTimer = 0;
    state.nextSpawn = 1.15;
    state.coinTimer = 0;
    state.nextCoin = 0.75;
    state.elapsed = 0;
    state.shake = 0;
    state.flash = 0;

    obstacles = [];
    coins = [];
    particles = [];

    player.x = Math.min(130, width() * 0.18);
    player.invulnerable = 0;
    player.runFrame = 0;
    placePlayerOnGround();

    updateHud();
  }

  function startGame() {
    resetGame();
    state.status = "playing";
    hideAllOverlays();
    ui.pauseIcon.textContent = "Ⅱ";
    state.lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (state.status !== "playing") return;
    state.status = "paused";
    ui.pauseScreen.classList.add("visible");
    ui.pauseIcon.textContent = "▶";
  }

  function resumeGame() {
    if (state.status !== "paused") return;
    state.status = "playing";
    ui.pauseScreen.classList.remove("visible");
    ui.pauseIcon.textContent = "Ⅱ";
    state.lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame() {
    state.status = "gameover";

    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("superPuloBest", String(state.best));
    }

    ui.finalScore.textContent = state.score;
    ui.finalCoins.textContent = state.coins;
    ui.finalMessage.textContent =
      state.score >= state.best && state.score > 0
        ? `Novo recorde! Você fez ${state.score} pontos.`
        : `Você fez ${state.score} pontos.`;

    updateHud();
    ui.gameOverScreen.classList.add("visible");
  }

  function hideAllOverlays() {
    ui.startScreen.classList.remove("visible");
    ui.pauseScreen.classList.remove("visible");
    ui.gameOverScreen.classList.remove("visible");
  }

  function togglePause() {
    if (state.status === "playing") {
      pauseGame();
    } else if (state.status === "paused") {
      resumeGame();
    }
  }

  function jump() {
    if (state.status === "start" || state.status === "gameover") {
      startGame();
      return;
    }

    if (state.status !== "playing") return;

    if (player.grounded) {
      player.vy = WORLD.jumpForce;
      player.grounded = false;
      burst(player.x + player.width * 0.35, groundY() - 4, 8, "#f3e0b0");
    }
  }

  function spawnObstacle() {
    const typeRoll = Math.random();
    let type;
    let obstacleWidth;
    let obstacleHeight;

    if (typeRoll < 0.42) {
      type = "crate";
      obstacleWidth = 58;
      obstacleHeight = 58;
    } else if (typeRoll < 0.78) {
      type = "spikes";
      obstacleWidth = 74;
      obstacleHeight = 34;
    } else {
      type = "barrel";
      obstacleWidth = 50;
      obstacleHeight = 64;
    }

    obstacles.push({
      type,
      x: width() + 60,
      y: groundY() - obstacleHeight,
      width: obstacleWidth,
      height: obstacleHeight,
      passed: false
    });

    if (state.elapsed > 16 && Math.random() < 0.22) {
      const extraWidth = Math.random() < 0.5 ? 50 : 62;
      const extraHeight = Math.random() < 0.5 ? 50 : 34;
      const extraType = extraHeight === 34 ? "spikes" : "crate";

      obstacles.push({
        type: extraType,
        x: width() + 60 + obstacleWidth + 55,
        y: groundY() - extraHeight,
        width: extraWidth,
        height: extraHeight,
        passed: false
      });
    }
  }

  function spawnCoinPattern() {
    const count = 3 + Math.floor(Math.random() * 3);
    const startX = width() + 70;
    const baseY = groundY() - 95 - Math.random() * 80;

    for (let i = 0; i < count; i++) {
      const arc = Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 45;
      coins.push({
        x: startX + i * 48,
        y: baseY - arc,
        radius: 15,
        rotation: Math.random() * Math.PI * 2,
        collected: false
      });
    }
  }

  function update(dt) {
    state.elapsed += dt;
    state.distance += state.speed * dt;
    state.score = Math.floor(state.distance / 20) + state.coins * 25;
    state.speed = Math.min(WORLD.maxSpeed, WORLD.baseSpeed + state.elapsed * 8.5);

    if (player.invulnerable > 0) {
      player.invulnerable -= dt;
    }

    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt);
    }

    if (state.flash > 0) {
      state.flash = Math.max(0, state.flash - dt);
    }

    updatePlayer(dt);
    updateBackground(dt);
    updateObstacles(dt);
    updateCoins(dt);
    updateParticles(dt);
    spawnObjects(dt);
    checkCollisions();
    updateHud();
  }

  function updatePlayer(dt) {
    player.vy += WORLD.gravity * dt;
    player.y += player.vy * dt;

    const floor = groundY() - player.height;
    if (player.y >= floor) {
      player.y = floor;
      player.vy = 0;
      player.grounded = true;
    }

    player.runFrame += dt * (state.speed / 70);
  }

  function updateBackground(dt) {
    for (const cloud of clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -140) {
        cloud.x = width() + 120;
        cloud.y = 35 + Math.random() * height() * 0.32;
      }
    }

    for (const hill of hills) {
      hill.x -= state.speed * 0.08 * dt;
      if (hill.x + hill.width < -60) {
        const rightMost = Math.max(...hills.map(h => h.x + h.width));
        hill.x = rightMost + 50;
        hill.width = 190 + Math.random() * 120;
        hill.height = 90 + Math.random() * 100;
      }
    }
  }

  function updateObstacles(dt) {
    for (const obstacle of obstacles) {
      obstacle.x -= state.speed * dt;

      if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
        obstacle.passed = true;
        state.score += 10;
      }
    }

    obstacles = obstacles.filter(o => o.x + o.width > -100);
  }

  function updateCoins(dt) {
    for (const coin of coins) {
      coin.x -= state.speed * dt;
      coin.rotation += dt * 7;
    }

    coins = coins.filter(c => !c.collected && c.x + c.radius > -50);
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.vy += 650 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size *= 0.985;
    }

    particles = particles.filter(p => p.life > 0 && p.size > 0.5);
  }

  function spawnObjects(dt) {
    state.spawnTimer += dt;
    state.coinTimer += dt;

    if (state.spawnTimer >= state.nextSpawn) {
      state.spawnTimer = 0;
      spawnObstacle();

      const speedFactor = (state.speed - WORLD.baseSpeed) / (WORLD.maxSpeed - WORLD.baseSpeed);
      state.nextSpawn = 1.05 + Math.random() * 0.65 - speedFactor * 0.2;
    }

    if (state.coinTimer >= state.nextCoin) {
      state.coinTimer = 0;
      spawnCoinPattern();
      state.nextCoin = 2.0 + Math.random() * 1.45;
    }
  }

  function checkCollisions() {
    const playerBox = {
      x: player.x + 10,
      y: player.y + 7,
      width: player.width - 20,
      height: player.height - 10
    };

    if (player.invulnerable <= 0) {
      for (const obstacle of obstacles) {
        const padding = obstacle.type === "spikes" ? 8 : 5;
        const obstacleBox = {
          x: obstacle.x + padding,
          y: obstacle.y + padding,
          width: obstacle.width - padding * 2,
          height: obstacle.height - padding
        };

        if (rectsOverlap(playerBox, obstacleBox)) {
          takeDamage();
          break;
        }
      }
    }

    for (const coin of coins) {
      if (coin.collected) continue;

      const closestX = clamp(coin.x, playerBox.x, playerBox.x + playerBox.width);
      const closestY = clamp(coin.y, playerBox.y, playerBox.y + playerBox.height);
      const dx = coin.x - closestX;
      const dy = coin.y - closestY;

      if (dx * dx + dy * dy < coin.radius * coin.radius) {
        coin.collected = true;
        state.coins += 1;
        burst(coin.x, coin.y, 12, "#ffd43b");
      }
    }
  }

  function takeDamage() {
    state.lives -= 1;
    player.invulnerable = 1.45;
    player.vy = -470;
    player.grounded = false;
    state.shake = 0.32;
    state.flash = 0.22;

    burst(player.x + player.width / 2, player.y + player.height / 2, 18, "#ff6b6b");

    if (state.lives <= 0) {
      endGame();
    }
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function burst(x, y, amount, color) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const force = 80 + Math.random() * 240;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force - 80,
        size: 3 + Math.random() * 6,
        life: 0.4 + Math.random() * 0.5,
        color
      });
    }
  }

  function updateHud() {
    ui.lives.textContent = "❤".repeat(Math.max(0, state.lives)) || "—";
    ui.score.textContent = state.score;
    ui.coins.textContent = state.coins;
    ui.best.textContent = Math.max(state.best, state.score);
  }

  function loop(timestamp) {
    if (state.status !== "playing") return;

    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
    state.lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function draw() {
    const w = width();
    const h = height();

    ctx.save();

    if (state.shake > 0) {
      const intensity = state.shake * 18;
      ctx.translate(
        (Math.random() - 0.5) * intensity,
        (Math.random() - 0.5) * intensity
      );
    }

    drawSky(w, h);
    drawClouds();
    drawHills();
    drawTrees();
    drawGround(w, h);

    for (const coin of coins) drawCoin(coin);
    for (const obstacle of obstacles) drawObstacle(obstacle);
    drawPlayer();
    drawParticles();

    ctx.restore();

    if (state.flash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${state.flash * 1.8})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  function drawSky(w, h) {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#4fc3ff");
    gradient.addColorStop(0.62, "#8edcff");
    gradient.addColorStop(1, "#d6f3ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#fff2a8";
    ctx.beginPath();
    ctx.arc(w * 0.84, h * 0.15, Math.max(24, w * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawClouds() {
    ctx.fillStyle = "rgba(255,255,255,0.84)";

    for (const cloud of clouds) {
      const x = cloud.x;
      const y = cloud.y;
      const s = cloud.scale;

      ctx.beginPath();
      ctx.arc(x, y, 24 * s, Math.PI, 0);
      ctx.arc(x + 28 * s, y - 13 * s, 31 * s, Math.PI, 0);
      ctx.arc(x + 64 * s, y, 24 * s, Math.PI, 0);
      ctx.lineTo(x + 88 * s, y + 18 * s);
      ctx.lineTo(x - 24 * s, y + 18 * s);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawHills() {
    for (let layer = 0; layer < 2; layer++) {
      ctx.save();
      ctx.globalAlpha = layer === 0 ? 0.28 : 0.45;
      ctx.fillStyle = layer === 0 ? "#3e85b3" : "#3aa17d";

      for (const hill of hills) {
        const x = hill.x + layer * 55;
        const base = groundY() + 4;
        const hw = hill.width;
        const hh = hill.height * (layer === 0 ? 1 : 0.65);

        ctx.beginPath();
        ctx.moveTo(x - hw / 2, base);
        ctx.quadraticCurveTo(x, base - hh, x + hw / 2, base);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawTrees() {
    const gy = groundY();
    const spacing = 105;
    const offset = -((state.distance * 0.18) % spacing);

    for (let x = offset - spacing; x < width() + spacing; x += spacing) {
      const size = 0.75 + ((Math.abs(Math.sin(x * 0.017)) + 0.2) * 0.5);

      ctx.fillStyle = "#216447";
      ctx.fillRect(x + 19 * size, gy - 72 * size, 13 * size, 72 * size);

      ctx.fillStyle = "#2f9b5e";
      ctx.beginPath();
      ctx.arc(x + 8 * size, gy - 68 * size, 28 * size, 0, Math.PI * 2);
      ctx.arc(x + 35 * size, gy - 83 * size, 33 * size, 0, Math.PI * 2);
      ctx.arc(x + 61 * size, gy - 65 * size, 27 * size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGround(w, h) {
    const gy = groundY();

    ctx.fillStyle = "#6acb31";
    ctx.fillRect(0, gy, w, 19);

    ctx.fillStyle = "#3d9f22";
    ctx.fillRect(0, gy + 13, w, 12);

    ctx.fillStyle = "#8b4e25";
    ctx.fillRect(0, gy + 25, w, h - gy - 25);

    const tile = 58;
    const offset = -((state.distance * 0.9) % tile);

    for (let x = offset - tile; x < w + tile; x += tile) {
      ctx.fillStyle = "rgba(76, 33, 12, 0.24)";
      ctx.beginPath();
      ctx.moveTo(x, gy + 25);
      ctx.lineTo(x + tile / 2, gy + 45);
      ctx.lineTo(x + tile, gy + 25);
      ctx.lineTo(x + tile, gy + 45);
      ctx.lineTo(x + tile / 2, gy + 65);
      ctx.lineTo(x, gy + 45);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#91df42";
    for (let x = offset; x < w + tile; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, gy + 14);
      ctx.lineTo(x + 8, gy + 2);
      ctx.lineTo(x + 15, gy + 14);
      ctx.fill();
    }
  }

  function drawObstacle(obstacle) {
    if (obstacle.type === "crate") {
      drawCrate(obstacle);
    } else if (obstacle.type === "spikes") {
      drawSpikes(obstacle);
    } else {
      drawBarrel(obstacle);
    }
  }

  function drawCrate(o) {
    ctx.save();
    ctx.translate(o.x, o.y);

    ctx.fillStyle = "#6d3218";
    roundedRect(0, 0, o.width, o.height, 7);
    ctx.fill();

    ctx.fillStyle = "#a95826";
    roundedRect(5, 5, o.width - 10, o.height - 10, 4);
    ctx.fill();

    ctx.strokeStyle = "#5a2814";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(9, 9);
    ctx.lineTo(o.width - 9, o.height - 9);
    ctx.moveTo(o.width - 9, 9);
    ctx.lineTo(9, o.height - 9);
    ctx.stroke();

    ctx.strokeStyle = "#d27a3d";
    ctx.lineWidth = 3;
    ctx.strokeRect(7, 7, o.width - 14, o.height - 14);
    ctx.restore();
  }

  function drawSpikes(o) {
    const count = 4;
    const gap = o.width / count;

    ctx.save();
    ctx.translate(o.x, o.y);
    for (let i = 0; i < count; i++) {
      const gradient = ctx.createLinearGradient(0, 0, 0, o.height);
      gradient.addColorStop(0, "#f2f7fa");
      gradient.addColorStop(1, "#71818b");

      ctx.fillStyle = gradient;
      ctx.strokeStyle = "#44535c";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(i * gap + 2, o.height);
      ctx.lineTo(i * gap + gap / 2, 0);
      ctx.lineTo(i * gap + gap - 2, o.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBarrel(o) {
    ctx.save();
    ctx.translate(o.x, o.y);

    const gradient = ctx.createLinearGradient(0, 0, o.width, 0);
    gradient.addColorStop(0, "#763112");
    gradient.addColorStop(0.5, "#b95e20");
    gradient.addColorStop(1, "#65280f");

    ctx.fillStyle = gradient;
    roundedRect(4, 0, o.width - 8, o.height, 11);
    ctx.fill();

    ctx.fillStyle = "#3d4c55";
    ctx.fillRect(2, 9, o.width - 4, 8);
    ctx.fillRect(2, o.height - 17, o.width - 4, 8);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(11, 7, 8, o.height - 14);
    ctx.restore();
  }

  function drawCoin(coin) {
    const squash = 0.45 + Math.abs(Math.cos(coin.rotation)) * 0.55;

    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.scale(squash, 1);

    ctx.fillStyle = "#ff9f0a";
    ctx.beginPath();
    ctx.arc(0, 0, coin.radius + 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fff0a1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, coin.radius - 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#e68a00";
    drawStar(0, 0, 6, coin.radius * 0.58, coin.radius * 0.27);
    ctx.fill();

    ctx.restore();
  }

  function drawPlayer() {
    const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0;
    if (blink) return;

    const x = player.x;
    const y = player.y;
    const running = player.grounded;
    const phase = player.runFrame;
    const legA = running ? Math.sin(phase) * 10 : -7;
    const legB = running ? Math.sin(phase + Math.PI) * 10 : 8;
    const armA = running ? Math.sin(phase + Math.PI) * 8 : 10;
    const armB = running ? Math.sin(phase) * 8 : -8;

    ctx.save();
    ctx.translate(x + player.width / 2, y + player.height / 2);

    // sombra
    ctx.save();
    ctx.translate(0, player.height / 2 + (groundY() - (player.y + player.height)) * 0.15);
    ctx.scale(1, 0.3);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // pernas
    drawLimb(-7, 15, -10 + legA, 31, 9, "#24507a");
    drawLimb(7, 15, 10 + legB, 31, 9, "#2c68a0");

    // tênis
    drawShoe(-10 + legA, 32, false);
    drawShoe(10 + legB, 32, true);

    // corpo
    ctx.fillStyle = "#ed4938";
    roundedRect(-18, -12, 36, 36, 10);
    ctx.fill();

    ctx.fillStyle = "#ff6a4e";
    roundedRect(-14, -9, 23, 28, 8);
    ctx.fill();

    // braços
    drawLimb(-16, -5, -27 + armA, 9, 8, "#f0a16f");
    drawLimb(16, -5, 27 + armB, 9, 8, "#f0a16f");

    // pescoço
    ctx.fillStyle = "#e99562";
    ctx.fillRect(-5, -20, 10, 10);

    // cabeça
    ctx.fillStyle = "#f2aa76";
    ctx.beginPath();
    ctx.arc(0, -31, 17, 0, Math.PI * 2);
    ctx.fill();

    // cabelo
    ctx.fillStyle = "#5a2c15";
    ctx.beginPath();
    ctx.arc(-2, -38, 16, Math.PI, Math.PI * 2);
    ctx.lineTo(15, -34);
    ctx.quadraticCurveTo(7, -48, 0, -43);
    ctx.quadraticCurveTo(-10, -51, -18, -39);
    ctx.closePath();
    ctx.fill();

    // franja
    ctx.beginPath();
    ctx.moveTo(-15, -42);
    ctx.lineTo(-4, -48);
    ctx.lineTo(-7, -38);
    ctx.lineTo(4, -47);
    ctx.lineTo(1, -36);
    ctx.closePath();
    ctx.fill();

    // rosto
    ctx.fillStyle = "#18212a";
    ctx.beginPath();
    ctx.arc(6, -32, 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#873d2b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(8, -27, 5, 0.15, 1.4);
    ctx.stroke();

    ctx.restore();
  }

  function drawLimb(x1, y1, x2, y2, lineWidth, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawShoe(x, y, right) {
    ctx.save();
    ctx.translate(x, y);
    if (!right) ctx.scale(-1, 1);

    ctx.fillStyle = "#f8fafc";
    roundedRect(-3, -4, 18, 9, 5);
    ctx.fill();

    ctx.fillStyle = "#273747";
    roundedRect(2, -4, 14, 6, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function roundedRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rotation = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(
        cx + Math.cos(rotation) * outerRadius,
        cy + Math.sin(rotation) * outerRadius
      );
      rotation += step;

      ctx.lineTo(
        cx + Math.cos(rotation) * innerRadius,
        cy + Math.sin(rotation) * innerRadius
      );
      rotation += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  ui.startBtn.addEventListener("click", startGame);
  ui.restartBtn.addEventListener("click", startGame);
  ui.resumeBtn.addEventListener("click", resumeGame);
  ui.pauseBtn.addEventListener("click", togglePause);

  ui.jumpBtn.addEventListener("pointerdown", event => {
    event.preventDefault();
    jump();
  });

  ui.gameArea.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;
    event.preventDefault();
    jump();
  });

  window.addEventListener("keydown", event => {
    const jumpKeys = ["Space", "ArrowUp", "KeyW"];

    if (jumpKeys.includes(event.code)) {
      event.preventDefault();
      jump();
    }

    if (event.code === "KeyP" || event.code === "Escape") {
      event.preventDefault();
      togglePause();
    }

    if (event.code === "Enter" && state.status === "gameover") {
      startGame();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.status === "playing") {
      pauseGame();
    }
  });

  window.addEventListener("resize", resizeCanvas);

  state.best = Number(localStorage.getItem("superPuloBest") || 0);
  updateHud();
  resizeCanvas();
  draw();
})();
