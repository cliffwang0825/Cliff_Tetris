const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const bombsEl = document.getElementById('bombs');
const shieldEl = document.getElementById('shield');
const startButton = document.getElementById('startButton');
const bombButton = document.getElementById('bombButton');
const muteButton = document.getElementById('muteButton');

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const BASE_WIDTH = 540;
const BASE_HEIGHT = 960;

const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  firing: false,
  pointerActive: false,
  pointerX: 0,
  pointerY: 0,
};

const KEYBINDS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
};

let lastTime = 0;
let paused = true;
let ready = false;
let renderDelta = 1 / 60;

const random = (min, max) => Math.random() * (max - min) + min;

const encodeSvg = svg =>
  `data:image/svg+xml;utf8,${svg
    .replace(/\n/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/"/g, "'")}`;

const spriteLibrary = {
  player: new Image(),
  enemyFighter: new Image(),
  enemyInterceptor: new Image(),
  enemyCarrier: new Image(),
  boss: new Image(),
  bulletRed: new Image(),
  bulletBlue: new Image(),
  powerups: {
    bomb: new Image(),
    speed: new Image(),
    spread: new Image(),
    shield: new Image(),
  },
};

spriteLibrary.player.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="128" viewBox="0 0 96 128">
    <defs>
      <linearGradient id="pBody" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#fffcf9" />
        <stop offset="0.4" stop-color="#ff4d4f" />
        <stop offset="1" stop-color="#a51216" />
      </linearGradient>
      <linearGradient id="pWing" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="1" stop-color="#cf2428" />
      </linearGradient>
    </defs>
    <path fill="url(#pBody)" d="M42 6h12l12 40-12 76h-12L30 46z" />
    <path fill="url(#pWing)" d="M18 60 6 96l30-18 6-30zm60 0 12 36-30-18-6-30z" />
    <path fill="#fff" opacity=".3" d="M42 12h12v32H42z" />
    <circle cx="48" cy="44" r="10" fill="#f7f9ff" opacity=".6" />
  </svg>
`);

spriteLibrary.enemyFighter.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="eBody" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#0d1b2a" />
        <stop offset="1" stop-color="#1b263b" />
      </linearGradient>
      <linearGradient id="eHighlight" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#1c78c0" />
        <stop offset="1" stop-color="#0b3d91" />
      </linearGradient>
    </defs>
    <path fill="url(#eBody)" d="M42 6h12l18 40-18 40H42L24 46z" />
    <path fill="url(#eHighlight)" d="M18 38 4 60l32-6 12-32zm60 0 14 22-32-6-12-32z" />
    <circle cx="48" cy="36" r="10" fill="#6ec1ff" opacity=".6" />
  </svg>
`);

spriteLibrary.enemyInterceptor.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="iBody" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#070b16" />
        <stop offset="1" stop-color="#151d2d" />
      </linearGradient>
      <linearGradient id="iEdge" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#0c6cf2" />
        <stop offset="1" stop-color="#042559" />
      </linearGradient>
    </defs>
    <path fill="url(#iBody)" d="M38 6h20l10 34-10 46H38L28 40z" />
    <path fill="url(#iEdge)" d="M16 32 6 54l28-8 14-24zm64 0 10 22-28-8-14-24z" />
    <rect x="42" y="12" width="12" height="26" fill="#99d8ff" opacity=".5" />
  </svg>
`);

spriteLibrary.enemyCarrier.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="cBody" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#050a15" />
        <stop offset="1" stop-color="#0f192a" />
      </linearGradient>
      <linearGradient id="cGlow" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#48a0ff" />
        <stop offset="1" stop-color="#103f7f" />
      </linearGradient>
    </defs>
    <rect x="26" y="12" width="76" height="104" rx="18" fill="url(#cBody)" />
    <rect x="18" y="48" width="92" height="18" rx="9" fill="url(#cGlow)" />
    <rect x="46" y="24" width="36" height="18" rx="8" fill="#1f2735" />
  </svg>
`);

spriteLibrary.boss.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="bossHull" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#0b1627" />
        <stop offset="1" stop-color="#03060f" />
      </linearGradient>
      <linearGradient id="bossEdge" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#1f6ceb" />
        <stop offset="1" stop-color="#0a1740" />
      </linearGradient>
    </defs>
    <path fill="url(#bossHull)" d="M102 10h52l60 120-60 116h-52L42 130z" />
    <path fill="url(#bossEdge)" d="M26 112 6 160l66-20 56-110zm204 0 20 48-66-20-56-110z" />
    <ellipse cx="128" cy="84" rx="32" ry="28" fill="#56a9ff" opacity=".65" />
  </svg>
`);

spriteLibrary.bulletRed.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="48" viewBox="0 0 24 48">
    <defs>
      <linearGradient id="bRed" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#fff4f4" />
        <stop offset="1" stop-color="#ff3134" />
      </linearGradient>
    </defs>
    <rect x="6" y="2" width="12" height="44" rx="6" fill="url(#bRed)" />
  </svg>
`);

spriteLibrary.bulletBlue.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="48" viewBox="0 0 24 48">
    <defs>
      <linearGradient id="bBlue" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#e0f3ff" />
        <stop offset="1" stop-color="#2f7aff" />
      </linearGradient>
    </defs>
    <rect x="6" y="2" width="12" height="44" rx="6" fill="url(#bBlue)" />
  </svg>
`);

spriteLibrary.powerups.bomb.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <circle cx="32" cy="34" r="20" fill="#2b2b2b" stroke="#ffa200" stroke-width="4" />
    <rect x="28" y="12" width="8" height="12" rx="3" fill="#ffa200" />
  </svg>
`);

spriteLibrary.powerups.speed.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <path fill="#3fb7ff" stroke="#0f89ff" stroke-width="4" d="M16 50 44 12l-8 22h16L24 52l8-16z" />
  </svg>
`);

spriteLibrary.powerups.spread.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <path fill="#ff5a67" stroke="#ffd4d8" stroke-width="4" d="M32 12 52 52H12z" />
  </svg>
`);

spriteLibrary.powerups.shield.src = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="shield" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#74d7ff" />
        <stop offset="1" stop-color="#1866ff" />
      </linearGradient>
    </defs>
    <path fill="url(#shield)" stroke="#f0f7ff" stroke-width="4" d="M32 8c-8 8-18 10-18 10v14c0 14 10 22 18 28 8-6 18-14 18-28V18S40 16 32 8z" />
  </svg>
`);

const audio = (() => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let muted = false;
  let bgmNode = null;
  let bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.18;
  bgmGain.connect(ctx.destination);

  function resume() {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function playTone({ frequency, duration = 0.2, type = 'sine', gain = 0.2 }) {
    if (muted) return;
    resume();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gainNode).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  function playShot() {
    playTone({ frequency: 660, duration: 0.08, type: 'square', gain: 0.15 });
  }

  function playExplosion() {
    if (muted) return;
    resume();
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    noise.connect(filter).connect(gainNode).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.4);
  }

  function playHit() {
    playTone({ frequency: 220, duration: 0.18, type: 'sawtooth', gain: 0.25 });
  }

  function startBgm() {
    if (muted || bgmNode) return;
    resume();
    const duration = 8;
    const sampleRate = ctx.sampleRate;
    const frameCount = sampleRate * duration;
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const melody = Math.sin(2 * Math.PI * 220 * t) * 0.4 + Math.sin(2 * Math.PI * 330 * t) * 0.2;
      const bass = Math.sin(2 * Math.PI * 110 * t) * 0.18;
      const beat = (i % (sampleRate / 2) < sampleRate / 8 ? 0.4 : 0) * Math.sin(2 * Math.PI * 55 * t);
      channelData[i] = (melody + bass + beat) * (1 - i / frameCount);
    }
    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = true;
    bufferSource.connect(bgmGain);
    bufferSource.start();
    bgmNode = bufferSource;
  }

  function stopBgm() {
    if (bgmNode) {
      bgmNode.stop();
      bgmNode.disconnect();
      bgmNode = null;
    }
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      stopBgm();
    } else {
      startBgm();
    }
    return muted;
  }

  return {
    playShot,
    playExplosion,
    playHit,
    startBgm,
    toggleMute,
  };
})();

class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
  }

  get bounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2,
    };
  }
}

class Player extends Entity {
  constructor() {
    super(BASE_WIDTH / 2, BASE_HEIGHT - 140, 72, 96);
    this.reset();
  }

  reset() {
    this.lives = 3;
    this.score = 0;
    this.maxHp = 3;
    this.respawn();
  }

  respawn() {
    this.x = BASE_WIDTH / 2;
    this.y = BASE_HEIGHT - 140;
    this.vx = 0;
    this.vy = 0;
    this.speed = 280;
    this.baseSpeed = 280;
    this.hp = this.maxHp;
    this.bombs = 2;
    this.weaponSpread = 1;
    this.spreadTimer = 0;
    this.speedTimer = 0;
    this.invincibleTimer = 2;
    this.fireCooldown = 0;
  }

  update(delta) {
    if (this.speedTimer > 0) {
      this.speedTimer -= delta;
      if (this.speedTimer <= 0) {
        this.speedTimer = 0;
        this.speed = this.baseSpeed;
      }
    }

    if (this.spreadTimer > 0) {
      this.spreadTimer -= delta;
      if (this.spreadTimer <= 0) {
        this.weaponSpread = 1;
      }
    }

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= delta;
    }

    const accel = this.speed;
    const targetVX = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const targetVY = (input.up ? -1 : 0) + (input.down ? 1 : 0);

    this.vx = targetVX * accel;
    this.vy = targetVY * accel;

    if (input.pointerActive) {
      const dx = input.pointerX - this.x;
      const dy = input.pointerY - this.y;
      const length = Math.hypot(dx, dy);
      if (length > 4) {
        const factor = Math.min(length / 120, 1);
        this.vx = (dx / length) * this.speed * factor;
        this.vy = (dy / length) * this.speed * factor;
      }
    }

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    const padding = 40;
    this.x = Math.min(Math.max(this.x, padding), BASE_WIDTH - padding);
    this.y = Math.min(Math.max(this.y, padding), BASE_HEIGHT - 160);

    if (this.fireCooldown > 0) {
      this.fireCooldown -= delta;
    }
  }

  takeHit() {
    if (this.invincibleTimer > 0) return;
    audio.playHit();
    this.hp -= 1;
    this.invincibleTimer = 0.5;
    if (this.hp <= 0) {
      this.lives -= 1;
      if (this.lives > 0) {
        this.respawn();
      } else {
        gameOver();
      }
    }
  }

  shoot() {
    if (this.fireCooldown > 0) return;
    this.fireCooldown = this.weaponSpread > 1 ? 0.12 : 0.18;
    audio.playShot();
    const bullets = [];
    if (this.weaponSpread === 1) {
      bullets.push(new Bullet(this.x, this.y - this.height / 2, 0, -620, false));
    } else {
      const spread = this.weaponSpread;
      for (let i = 0; i < spread; i++) {
        const angle = (i - (spread - 1) / 2) * 0.18;
        const speed = 620;
        bullets.push(new Bullet(this.x, this.y - this.height / 2, Math.sin(angle) * speed, -Math.cos(angle) * speed, false));
      }
    }
    return bullets;
  }

  useBomb() {
    if (this.bombs <= 0) return false;
    this.bombs -= 1;
    audio.playExplosion();
    clearScreenWithBomb();
    return true;
  }
}

class Bullet extends Entity {
  constructor(x, y, vx, vy, hostile) {
    super(x, y, 18, 36);
    this.vx = vx;
    this.vy = vy;
    this.hostile = hostile;
  }

  update(delta) {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    if (this.y < -60 || this.y > BASE_HEIGHT + 60 || this.x < -60 || this.x > BASE_WIDTH + 60) {
      this.dead = true;
    }
  }

  draw() {
    const sprite = this.hostile ? spriteLibrary.bulletBlue : spriteLibrary.bulletRed;
    drawSprite(sprite, this.x, this.y, this.width, this.height);
  }
}

class Enemy extends Entity {
  constructor(x, y, width, height, type) {
    super(x, y, width, height);
    this.type = type;
    this.hp = 1;
    this.score = 100;
    this.fireCooldown = random(1.4, 2.6);
    this.powerUpType = null;
  }

  update(delta) {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    if (this.y > BASE_HEIGHT + 120) {
      this.dead = true;
    }

    if (this.fireCooldown > 0) {
      this.fireCooldown -= delta;
    }
  }

  canShoot() {
    return this.fireCooldown <= 0 && this.y > 40;
  }

  resetFireCooldown() {
    this.fireCooldown = random(1.2, 2.4);
  }

  draw() {
    let sprite = spriteLibrary.enemyFighter;
    if (this.type === 'interceptor') sprite = spriteLibrary.enemyInterceptor;
    if (this.type === 'carrier') sprite = spriteLibrary.enemyCarrier;
    drawSprite(sprite, this.x, this.y, this.width, this.height);
  }
}

class Boss extends Enemy {
  constructor() {
    super(BASE_WIDTH / 2, -200, 200, 220, 'boss');
    this.hp = 60;
    this.score = 5000;
    this.phase = 0;
    this.entry = true;
    this.fireCooldown = 2.5;
  }

  update(delta) {
    if (this.entry) {
      this.y += 80 * delta;
      if (this.y >= 200) {
        this.entry = false;
      }
      return;
    }

    const amplitude = 140;
    const speed = 0.6;
    this.x = BASE_WIDTH / 2 + Math.sin(gameState.gameTime * speed) * amplitude;

    if (this.fireCooldown > 0) {
      this.fireCooldown -= delta;
    }
  }

  draw() {
    drawSprite(spriteLibrary.boss, this.x, this.y, this.width, this.height);
  }
}

class PowerUp extends Entity {
  constructor(x, y, type) {
    super(x, y, 48, 48);
    this.type = type;
    this.vy = 120;
  }

  update(delta) {
    this.y += this.vy * delta;
    if (this.y > BASE_HEIGHT + 80) this.dead = true;
  }

  draw() {
    drawSprite(spriteLibrary.powerups[this.type], this.x, this.y, this.width, this.height);
  }
}

const gameState = {
  player: new Player(),
  bullets: [],
  enemyBullets: [],
  enemies: [],
  powerUps: [],
  particles: [],
  score: 0,
  waveIndex: 0,
  gameTime: 0,
  bossSpawned: false,
  bossDefeated: false,
  background: { top: '#040b1f', bottom: '#02030a' },
  spawnTimers: {
    fighter: 0,
    interceptor: 4,
    carrier: 9,
  },
};

const wavePlan = [
  {
    name: '前哨波',
    duration: 32,
    background: { top: '#090c1f', bottom: '#050311' },
    spawn: {
      fighter: 1.2,
      interceptor: 3.8,
      carrier: 9.5,
    },
  },
  {
    name: '離子風暴',
    duration: 34,
    background: { top: '#071529', bottom: '#020817' },
    spawn: {
      fighter: 0.9,
      interceptor: 3,
      carrier: 8,
    },
  },
  {
    name: '星際決戰',
    duration: Infinity,
    background: { top: '#061a33', bottom: '#01040c' },
    spawn: {
      fighter: 0.75,
      interceptor: 2.6,
      carrier: 6.8,
    },
  },
];

const carrierDrops = ['bomb', 'speed', 'spread', 'shield'];
let carrierDropIndex = 0;

function update(delta) {
  const player = gameState.player;
  if (!player) return;

  gameState.gameTime += delta;
  const wave = resolveWave(gameState.gameTime);
  gameState.waveIndex = wave.index;
  gameState.background = wave.background;

  // update player
  player.update(delta);
  if (input.firing) {
    const newBullets = player.shoot();
    if (newBullets) {
      gameState.bullets.push(...newBullets);
    }
  }

  // update bullets
  for (const bullet of gameState.bullets) {
    bullet.update(delta);
    for (const enemy of gameState.enemies) {
      if (!enemy.dead && !bullet.dead && intersects(bullet, enemy)) {
        bullet.dead = true;
        enemy.hp -= 1;
        if (enemy.hp <= 0) {
          destroyEnemy(enemy);
        } else {
          audio.playHit();
        }
      }
    }
  }

  for (const bullet of gameState.enemyBullets) {
    bullet.update(delta);
    if (!bullet.dead && intersects(bullet, player)) {
      bullet.dead = true;
      player.takeHit();
    }
  }

  // update enemies
  for (const enemy of gameState.enemies) {
    enemy.update(delta);
    if (enemy.type !== 'boss' && enemy.canShoot()) {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      const speed = enemy.type === 'interceptor' ? 280 : 240;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      gameState.enemyBullets.push(new Bullet(enemy.x, enemy.y + enemy.height / 2, vx, vy, true));
      enemy.resetFireCooldown();
    }

    if (enemy.type === 'boss' && enemy.fireCooldown <= 0 && !enemy.dead) {
      fireBossPattern(enemy);
      enemy.fireCooldown = 2.4;
    }

    if (!enemy.dead && intersects(enemy, player)) {
      player.takeHit();
      if (enemy.type !== 'boss') {
        destroyEnemy(enemy, true);
      }
    }
  }

  // update powerups
  for (const powerUp of gameState.powerUps) {
    powerUp.update(delta);
    if (!powerUp.dead && intersects(powerUp, player)) {
      applyPowerUp(powerUp.type);
      powerUp.dead = true;
    }
  }

  gameState.bullets = gameState.bullets.filter(b => !b.dead);
  gameState.enemyBullets = gameState.enemyBullets.filter(b => !b.dead);
  gameState.enemies = gameState.enemies.filter(e => !e.dead);
  gameState.powerUps = gameState.powerUps.filter(p => !p.dead);

  spawnEnemies(delta, wave);
  maybeSpawnBoss();

  updateHud();
}

function resolveWave(gameTime) {
  let elapsed = gameTime;
  for (let i = 0; i < wavePlan.length; i++) {
    const wave = wavePlan[i];
    if (elapsed < wave.duration || wave.duration === Infinity) {
      return { index: i + 1, background: wave.background, config: wave.spawn };
    }
    elapsed -= wave.duration;
  }
  const lastWave = wavePlan[wavePlan.length - 1];
  return { index: wavePlan.length, background: lastWave.background, config: lastWave.spawn };
}

function spawnEnemies(delta, wave) {
  const config = wave.config;
  Object.keys(gameState.spawnTimers).forEach(type => {
    gameState.spawnTimers[type] -= delta;
  });

  if (gameState.spawnTimers.fighter <= 0) {
    spawnFighter();
    gameState.spawnTimers.fighter = random(config.fighter * 0.8, config.fighter * 1.2);
  }

  if (gameState.spawnTimers.interceptor <= 0 && gameState.gameTime > 10) {
    spawnInterceptor();
    gameState.spawnTimers.interceptor = random(config.interceptor * 0.9, config.interceptor * 1.1);
  }

  if (gameState.spawnTimers.carrier <= 0 && gameState.gameTime > 20) {
    spawnCarrier();
    gameState.spawnTimers.carrier = random(config.carrier * 0.9, config.carrier * 1.15);
  }
}

function spawnFighter() {
  const enemy = new Enemy(random(60, BASE_WIDTH - 60), -80, 72, 80, 'fighter');
  enemy.vy = random(120, 180);
  enemy.hp = 1;
  enemy.score = 120;
  gameState.enemies.push(enemy);
}

function spawnInterceptor() {
  const enemy = new Enemy(random(60, BASE_WIDTH - 60), -80, 64, 78, 'interceptor');
  enemy.vy = random(160, 220);
  enemy.vx = random(-30, 30);
  enemy.hp = 2;
  enemy.score = 220;
  gameState.enemies.push(enemy);
}

function spawnCarrier() {
  const enemy = new Enemy(random(80, BASE_WIDTH - 80), -120, 96, 110, 'carrier');
  enemy.vy = random(80, 120);
  enemy.hp = 3;
  enemy.score = 360;
  enemy.powerUpType = carrierDrops[carrierDropIndex % carrierDrops.length];
  carrierDropIndex += 1;
  gameState.enemies.push(enemy);
}

function maybeSpawnBoss() {
  if (gameState.bossSpawned || gameState.bossDefeated) return;
  if (gameState.gameTime > 75 || gameState.score > 8500) {
    const boss = new Boss();
    boss.hp = 80;
    gameState.enemies.push(boss);
    gameState.bossSpawned = true;
  }
}

function fireBossPattern(boss) {
  const waves = 12;
  for (let i = 0; i < waves; i++) {
    const angle = (Math.PI * 2 * i) / waves + gameState.gameTime * 0.8;
    const speed = 220;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const bullet = new Bullet(boss.x + Math.cos(angle) * 40, boss.y + Math.sin(angle) * 40, vx, vy, true);
    bullet.width = 24;
    bullet.height = 32;
    gameState.enemyBullets.push(bullet);
  }
}

function destroyEnemy(enemy, skipScore = false) {
  enemy.dead = true;
  audio.playExplosion();
  if (!skipScore) {
    gameState.score += enemy.score;
    updateScore();
  }
  if (enemy.type === 'boss') {
    gameState.bossSpawned = false;
    gameState.bossDefeated = true;
  }
  if (enemy.powerUpType) {
    const powerUp = new PowerUp(enemy.x, enemy.y, enemy.powerUpType);
    gameState.powerUps.push(powerUp);
  }
}

function applyPowerUp(type) {
  const player = gameState.player;
  switch (type) {
    case 'bomb':
      player.bombs = Math.min(player.bombs + 1, 2);
      break;
    case 'speed':
      player.speed = player.baseSpeed * 1.4;
      player.speedTimer = 10;
      break;
    case 'spread':
      player.weaponSpread = Math.min(player.weaponSpread + 1, 3);
      player.spreadTimer = 12;
      break;
    case 'shield':
      player.maxHp = Math.min(player.maxHp + 1, 5);
      player.hp = player.maxHp;
      break;
  }
  updateHud();
}

function clearScreenWithBomb() {
  for (const enemy of gameState.enemies) {
    if (enemy.type !== 'boss') {
      destroyEnemy(enemy);
    }
  }
  for (const bullet of gameState.enemyBullets) {
    bullet.dead = true;
  }
}

function intersects(a, b) {
  const ab = a.bounds;
  const bb = b.bounds;
  return !(ab.right < bb.left || ab.left > bb.right || ab.bottom < bb.top || ab.top > bb.bottom);
}

function updateHud() {
  const player = gameState.player;
  waveEl.textContent = gameState.waveIndex;
  renderSegments(livesEl, player.lives, 3);
  renderSegments(bombsEl, player.bombs, 2);
  renderSegments(shieldEl, player.hp, player.maxHp);
}

function updateScore() {
  gameState.player.score = gameState.score;
  scoreEl.textContent = gameState.score.toLocaleString('zh-TW');
}

function renderSegments(container, active, max) {
  container.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const span = document.createElement('span');
    if (i < active) span.classList.add('active');
    container.appendChild(span);
  }
}

function drawSprite(sprite, x, y, width, height) {
  ctx.drawImage(sprite, x - width / 2, y - height / 2, width, height);
}

function render() {
  const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  gradient.addColorStop(0, gameState.background.top);
  gradient.addColorStop(1, gameState.background.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  drawStars();

  for (const bullet of gameState.bullets) {
    bullet.draw();
  }
  for (const bullet of gameState.enemyBullets) {
    bullet.draw();
  }
  for (const enemy of gameState.enemies) {
    enemy.draw();
  }
  for (const powerUp of gameState.powerUps) {
    powerUp.draw();
  }

  drawPlayer();
  drawOverlay();
}

const starfield = new Array(80).fill(0).map(() => ({
  x: Math.random() * BASE_WIDTH,
  y: Math.random() * BASE_HEIGHT,
  speed: random(60, 180),
  size: random(1, 3),
}));

function drawStars() {
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#ffffff';
  starfield.forEach(star => {
    star.y += star.speed * renderDelta;
    if (star.y > BASE_HEIGHT) star.y = -10;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawPlayer() {
  const player = gameState.player;
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }
  drawSprite(spriteLibrary.player, player.x, player.y, player.width, player.height);
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  if (paused && ready) {
    ctx.fillStyle = 'rgba(5, 8, 20, 0.65)';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '32px "Segoe UI", "Noto Sans TC", sans-serif';
    ctx.fillText('點擊「開始」啟動任務', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 20);
    ctx.font = '18px "Segoe UI", "Noto Sans TC"';
    ctx.fillText('WASD/方向鍵移動，J 射擊，K 投彈', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 20);
  }
}

function resizeCanvas() {
  const wrapper = canvas.parentElement;
  const targetWidth = wrapper.clientWidth;
  const aspect = BASE_HEIGHT / BASE_WIDTH;
  const targetHeight = targetWidth * aspect;
  canvas.style.height = `${targetHeight}px`;

  canvas.width = Math.floor(BASE_WIDTH * DPR);
  canvas.height = Math.floor(BASE_HEIGHT * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function step(timestamp) {
  if (!ready) {
    ready = true;
    updateHud();
    render();
  }
  const delta = Math.min((timestamp - lastTime) / 1000 || 0, 0.05);
  lastTime = timestamp;
  renderDelta = delta;

  if (!paused) {
    update(delta);
  }
  render();
  requestAnimationFrame(step);
}

function togglePause() {
  paused = !paused;
  startButton.textContent = paused ? '開始 / 暫停' : '暫停';
  if (!paused) {
    audio.startBgm();
  }
}

function gameOver() {
  paused = true;
  startButton.textContent = '重新開始';
  ctx.fillStyle = 'rgba(5, 8, 20, 0.75)';
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  ctx.fillStyle = '#ffed75';
  ctx.textAlign = 'center';
  ctx.font = '36px "Segoe UI", "Noto Sans TC"';
  ctx.fillText('任務失敗', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 20);
  ctx.font = '20px "Segoe UI", "Noto Sans TC"';
  ctx.fillText(`最終分數：${gameState.score.toLocaleString('zh-TW')}`, BASE_WIDTH / 2, BASE_HEIGHT / 2 + 20);
}

function resetGame() {
  gameState.player.reset();
  gameState.bullets = [];
  gameState.enemyBullets = [];
  gameState.enemies = [];
  gameState.powerUps = [];
  gameState.particles = [];
  gameState.score = 0;
  gameState.gameTime = 0;
  gameState.waveIndex = 1;
  gameState.spawnTimers = { fighter: 0, interceptor: 4, carrier: 9 };
  gameState.bossSpawned = false;
  gameState.bossDefeated = false;
  carrierDropIndex = 0;
  updateScore();
  updateHud();
}

// Event bindings
window.addEventListener('keydown', e => {
  const key = e.key;
  if (key.toLowerCase() === 'j') {
    input.firing = true;
  } else if (key.toLowerCase() === 'k') {
    if (gameState.player.useBomb()) {
      updateHud();
    }
  } else if (key.toLowerCase() === 'm') {
    const muted = audio.toggleMute();
    muteButton.textContent = muted ? '🔊 解除靜音' : '🔇 靜音';
  }
  if (KEYBINDS[key]) {
    input[KEYBINDS[key]] = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  const key = e.key;
  if (key.toLowerCase() === 'j') {
    input.firing = false;
  }
  if (KEYBINDS[key]) {
    input[KEYBINDS[key]] = false;
  }
});

canvas.addEventListener('pointerdown', e => {
  const rect = canvas.getBoundingClientRect();
  input.pointerActive = true;
  input.firing = true;
  input.pointerX = ((e.clientX - rect.left) / rect.width) * BASE_WIDTH;
  input.pointerY = ((e.clientY - rect.top) / rect.height) * BASE_HEIGHT;
});

canvas.addEventListener('pointermove', e => {
  if (!input.pointerActive) return;
  const rect = canvas.getBoundingClientRect();
  input.pointerX = ((e.clientX - rect.left) / rect.width) * BASE_WIDTH;
  input.pointerY = ((e.clientY - rect.top) / rect.height) * BASE_HEIGHT;
});

function releasePointer() {
  input.pointerActive = false;
  input.firing = false;
}

window.addEventListener('pointerup', releasePointer);
window.addEventListener('pointercancel', releasePointer);

startButton.addEventListener('click', () => {
  if (paused) {
    if (gameState.player.lives <= 0) {
      resetGame();
    }
  }
  togglePause();
});

bombButton.addEventListener('click', () => {
  if (gameState.player.useBomb()) {
    updateHud();
  }
});

muteButton.addEventListener('click', () => {
  const muted = audio.toggleMute();
  muteButton.textContent = muted ? '🔊 解除靜音' : '🔇 靜音';
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
requestAnimationFrame(step);

// ensure 60fps clamp via CSS animation is handled by RAF
