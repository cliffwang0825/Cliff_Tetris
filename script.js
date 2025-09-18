const colors = [
  null,
  '#b175ff', // amethyst
  '#ff4060', // ruby
  '#35d47f', // emerald
  '#67c9ff', // sapphire
  '#ffe66d', // citrine
  '#00f6d0', // aquamarine
  '#f7a1ff', // rose quartz
  '#8b939b', // forged steel (garbage rows)
];

const pieces = 'TJLOSZI';

const BASE_DROP_INTERVAL = 1000;
const DROP_INTERVAL_STEP = 90;
const DROP_INTERVAL_FLOOR = 120;

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  switch (type) {
    case 'T':
      return [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ];
    case 'O':
      return [
        [2, 2],
        [2, 2],
      ];
    case 'L':
      return [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3],
      ];
    case 'J':
      return [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0],
      ];
    case 'I':
      return [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
      ];
    case 'S':
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
      ];
    case 'Z':
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ];
    default:
      return [
        [1, 1],
        [1, 1],
      ];
  }
}

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function adjustColor(hex, percent) {
  if (!hex) {
    return '#000000';
  }
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;

  if (percent < 0) {
    const factor = 1 + percent;
    r = Math.max(0, Math.round(r * factor));
    g = Math.max(0, Math.round(g * factor));
    b = Math.max(0, Math.round(b * factor));
  } else {
    r = Math.min(255, Math.round(r + (255 - r) * percent));
    g = Math.min(255, Math.round(g + (255 - g) * percent));
    b = Math.min(255, Math.round(b + (255 - b) * percent));
  }

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function drawMetalCell(context, value, x, y, width, height) {
  const baseColor = colors[value] || '#9aa0a6';
  const highlight = adjustColor(baseColor, 0.45);
  const midTone = adjustColor(baseColor, -0.1);
  const shadow = adjustColor(baseColor, -0.35);

  context.save();
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, highlight);
  gradient.addColorStop(0.35, baseColor);
  gradient.addColorStop(0.6, midTone);
  gradient.addColorStop(1, shadow);
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);

  const sheen = context.createLinearGradient(x, y, x + width, y);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
  context.fillStyle = sheen;
  context.globalAlpha = 0.5;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + width, y);
  context.lineTo(x + width * 0.55, y + height * 0.45);
  context.closePath();
  context.fill();

  context.globalAlpha = 0.6;
  context.beginPath();
  context.moveTo(x + width, y + height);
  context.lineTo(x, y + height);
  context.lineTo(x + width * 0.45, y + height * 0.55);
  context.closePath();
  context.fillStyle = adjustColor(baseColor, -0.45);
  context.fill();

  context.globalAlpha = 1;
  const borderWidth = Math.max(width * 0.08, 0.02);
  context.lineJoin = 'round';
  context.strokeStyle = adjustColor(baseColor, -0.55);
  context.lineWidth = borderWidth;
  context.strokeRect(x, y, width, height);

  const facetWidth = Math.max(width * 0.05, 0.015);
  context.strokeStyle = adjustColor(baseColor, 0.35);
  context.lineWidth = facetWidth;
  context.beginPath();
  context.moveTo(x + width * 0.15, y + height * 0.2);
  context.lineTo(x + width * 0.85, y + height * 0.8);
  context.moveTo(x + width * 0.85, y + height * 0.2);
  context.lineTo(x + width * 0.15, y + height * 0.8);
  context.stroke();
  context.restore();
}

function drawMatrix(context, matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const xPos = x + offset.x;
        const yPos = y + offset.y;
        drawMetalCell(context, value, xPos, yPos, 1, 1);
      }
    });
  });
}

function drawPreviewMatrix(context, matrix, offset, cellSize) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const xPos = offset.x + x * cellSize;
        const yPos = offset.y + y * cellSize;
        drawMetalCell(context, value, xPos, yPos, cellSize, cellSize);
      }
    });
  });
}

function getMatrixBounds(matrix) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    });
  });
  if (minX === Infinity) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }
  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    offsetX: minX,
    offsetY: minY,
  };
}

function calculateDropInterval(level) {
  return Math.max(DROP_INTERVAL_FLOOR, BASE_DROP_INTERVAL - (level - 1) * DROP_INTERVAL_STEP);
}

function buildKeyMap(controls) {
  const map = {};
  Object.entries(controls).forEach(([action, codes]) => {
    codes.forEach(code => {
      map[code] = action;
    });
  });
  return map;
}

function cloneControls(base) {
  const clone = {};
  Object.keys(base).forEach(key => {
    clone[key] = base[key].slice();
  });
  return clone;
}

function createPlayerConfig(label, baseControls) {
  return {
    label,
    controls: cloneControls(baseControls),
  };
}

const PLAYER_ONE_CONTROLS = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  down: ['ArrowDown'],
  rotateCW: ['ArrowUp'],
  rotateCCW: ['Slash'],
  hardDrop: ['Space'],
};

const PLAYER_TWO_CONTROLS = {
  left: ['KeyA'],
  right: ['KeyD'],
  down: ['KeyS'],
  rotateCW: ['KeyW'],
  rotateCCW: ['KeyQ'],
  hardDrop: ['KeyF'],
};

function getModeConfig(mode) {
  switch (mode) {
    case 'single':
      return {
        survival: false,
        players: [createPlayerConfig('Player 1', PLAYER_ONE_CONTROLS)],
      };
    case 'duo-score':
      return {
        survival: false,
        players: [
          createPlayerConfig('Player 1', PLAYER_ONE_CONTROLS),
          createPlayerConfig('Player 2', PLAYER_TWO_CONTROLS),
        ],
      };
    case 'duo-survival':
      return {
        survival: true,
        players: [
          createPlayerConfig('Player 1', PLAYER_ONE_CONTROLS),
          createPlayerConfig('Player 2', PLAYER_TWO_CONTROLS),
        ],
      };
    default:
      return null;
  }
}

const modeSelect = document.getElementById('modeSelect');
const playfieldLayout = document.getElementById('playfieldLayout');
const gameArea = document.getElementById('gameArea');
const scoreboardLeft = document.getElementById('scoreboardLeft');
const scoreboardRight = document.getElementById('scoreboardRight');
const changeModeBtn = document.getElementById('changeMode');
const controlsButton = document.getElementById('controlsButton');
const controlsOverlay = document.getElementById('controlsOverlay');
const closeControlsBtn = document.getElementById('closeControls');
const controlsPlayerTwo = document.getElementById('controlsPlayer2');
const controlsModeNote = document.getElementById('controlsModeNote');
const message = document.getElementById('message');
const leaderboard = document.getElementById('leaderboard');
const leadersList = document.getElementById('leaders');

const DEFAULT_MODE_NOTE =
  'Stack efficiently, keep an eye on the preview, and ride the rhythm of the falling blocks.';

const games = [];
let messageTimeout = null;
let leaderboardTimeout = null;
let audioContext = null;
let paused = false;

function initAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }
  if (!audioContext) {
    audioContext = new AudioCtx();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
}

function createNoiseBuffer(duration, falloffPower = 1.5) {
  const length = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const progress = i / length;
    const envelope = Math.pow(1 - progress, falloffPower);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }
  return buffer;
}

function playSound(type) {
  if (!audioContext || audioContext.state !== 'running') {
    return;
  }
  const now = audioContext.currentTime;

  if (type === 'land') {
    const rubble = audioContext.createBufferSource();
    rubble.buffer = createNoiseBuffer(0.32, 2.1);
    const rubbleFilter = audioContext.createBiquadFilter();
    rubbleFilter.type = 'lowpass';
    rubbleFilter.frequency.setValueAtTime(420, now);
    const rubbleGain = audioContext.createGain();
    rubbleGain.gain.setValueAtTime(0.0001, now);
    rubbleGain.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
    rubbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    rubble.connect(rubbleFilter);
    rubbleFilter.connect(rubbleGain);
    rubbleGain.connect(audioContext.destination);
    rubble.start(now);
    rubble.stop(now + 0.35);

    const thump = audioContext.createOscillator();
    const thumpGain = audioContext.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(95, now);
    thump.frequency.exponentialRampToValueAtTime(48, now + 0.32);
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.45, now + 0.01);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    thump.connect(thumpGain);
    thumpGain.connect(audioContext.destination);
    thump.start(now);
    thump.stop(now + 0.34);
    return;
  }

  if (type === 'clear') {
    const blast = audioContext.createBufferSource();
    blast.buffer = createNoiseBuffer(0.48, 1.4);
    const blastFilter = audioContext.createBiquadFilter();
    blastFilter.type = 'lowpass';
    blastFilter.frequency.setValueAtTime(420, now);
    blastFilter.Q.setValueAtTime(0.9, now);
    const blastGain = audioContext.createGain();
    blastGain.gain.setValueAtTime(0.0001, now);
    blastGain.gain.exponentialRampToValueAtTime(0.95, now + 0.035);
    blastGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    blast.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(audioContext.destination);
    blast.start(now);
    blast.stop(now + 0.55);

    const shock = audioContext.createOscillator();
    const shockGain = audioContext.createGain();
    shock.type = 'square';
    shock.frequency.setValueAtTime(160, now);
    shock.frequency.exponentialRampToValueAtTime(58, now + 0.4);
    shockGain.gain.setValueAtTime(0.0001, now);
    shockGain.gain.exponentialRampToValueAtTime(0.42, now + 0.03);
    shockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    shock.connect(shockGain);
    shockGain.connect(audioContext.destination);
    shock.start(now + 0.01);
    shock.stop(now + 0.46);

    const shrapnel = audioContext.createBufferSource();
    shrapnel.buffer = createNoiseBuffer(0.4, 2.2);
    const shrapnelFilter = audioContext.createBiquadFilter();
    shrapnelFilter.type = 'bandpass';
    shrapnelFilter.frequency.setValueAtTime(850, now);
    shrapnelFilter.Q.setValueAtTime(1.2, now);
    const shrapnelGain = audioContext.createGain();
    shrapnelGain.gain.setValueAtTime(0.0001, now);
    shrapnelGain.gain.exponentialRampToValueAtTime(0.33, now + 0.06);
    shrapnelGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    shrapnel.connect(shrapnelFilter);
    shrapnelFilter.connect(shrapnelGain);
    shrapnelGain.connect(audioContext.destination);
    shrapnel.start(now + 0.02);
    shrapnel.stop(now + 0.5);

    const rumble = audioContext.createOscillator();
    const rumbleGain = audioContext.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(72, now);
    rumble.frequency.exponentialRampToValueAtTime(28, now + 0.9);
    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.48, now + 0.08);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    rumble.connect(rumbleGain);
    rumbleGain.connect(audioContext.destination);
    rumble.start(now + 0.04);
    rumble.stop(now + 0.92);
    return;
  }

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(220, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.start(now);
  osc.stop(now + 0.25);
}

function hideControlsOverlay() {
  if (controlsOverlay) {
    controlsOverlay.classList.add('hidden');
  }
}

function resetControlsOverlay() {
  hideControlsOverlay();
  if (controlsPlayerTwo) {
    controlsPlayerTwo.classList.add('hidden');
  }
  if (controlsModeNote) {
    controlsModeNote.textContent = DEFAULT_MODE_NOTE;
  }
}

function configureControlsOverlay(config) {
  if (!config) {
    resetControlsOverlay();
    return;
  }
  if (controlsPlayerTwo) {
    if (config.players.length > 1) {
      controlsPlayerTwo.classList.remove('hidden');
    } else {
      controlsPlayerTwo.classList.add('hidden');
    }
  }
  if (controlsModeNote) {
    if (config.survival && config.players.length > 1) {
      controlsModeNote.textContent =
        'Survival duel: clear lines to dump surprise rubble onto your opponent.';
    } else if (config.players.length > 1) {
      controlsModeNote.textContent =
        'Dual score mode: race your rival for points and keep both fields clean.';
    } else {
      controlsModeNote.textContent =
        'Solo mode: chain line clears to climb the rankings before the stack tops out.';
    }
  }
}

function showMessage(text, duration = 4000) {
  if (!message) {
    return;
  }
  message.textContent = text;
  message.classList.remove('hidden');
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }
  messageTimeout = setTimeout(() => {
    message.classList.add('hidden');
  }, duration);
}

function clearMessage() {
  if (messageTimeout) {
    clearTimeout(messageTimeout);
    messageTimeout = null;
  }
  if (message) {
    message.classList.add('hidden');
    message.textContent = '';
  }
}

function renderLeaderboard() {
  if (!leadersList || !leaderboard) {
    return;
  }
  const board = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  leadersList.innerHTML = '';
  board.slice(0, 3).forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name} - ${item.score} pts - ${item.duration}s - ${item.date}`;
    leadersList.appendChild(li);
  });
  leaderboard.classList.remove('hidden');
  if (leaderboardTimeout) {
    clearTimeout(leaderboardTimeout);
  }
  leaderboardTimeout = setTimeout(() => leaderboard.classList.add('hidden'), 5000);
}

function saveLeaderboardEntry(game) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  const duration = ((Date.now() - game.startTime) / 1000).toFixed(1);
  let name = 'Anonymous';
  if (typeof prompt === 'function') {
    const response = prompt(`${game.label} Game Over! Enter your name:`);
    if (response) {
      name = response;
    }
  }
  const entry = {
    name,
    score: game.score,
    date: new Date().toLocaleDateString(),
    duration,
  };
  const board = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  localStorage.setItem('leaderboard', JSON.stringify(board.slice(0, 3)));
  renderLeaderboard();
}

function createGame({ canvas, panel, controls, label, modeType, burstLayer, side }) {
  const context = canvas.getContext('2d');
  context.scale(20, 20);

  const arena = createMatrix(12, 20);
  const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
  };

  const game = {
    canvas,
    context,
    arena,
    player,
    dropCounter: 0,
    dropInterval: calculateDropInterval(1),
    lastTime: 0,
    score: 0,
    lines: 0,
    level: 1,
    linesForNextLevel: 10,
    nextMatrix: null,
    over: false,
    startTime: Date.now(),
    label,
    modeType,
    survival: modeType === 'duo-survival',
    opponent: null,
    keyMap: buildKeyMap(controls),
    panel,
    burstLayer,
    side,
  };

  game.scoreEl = panel.querySelector('.score');
  game.linesEl = panel.querySelector('.lines');
  game.levelEl = panel.querySelector('.level');
  game.statusEl = panel.querySelector('.status');
  game.previewCanvas = panel.querySelector('.next');
  game.previewContext = game.previewCanvas ? game.previewCanvas.getContext('2d') : null;
  if (game.previewContext) {
    game.previewContext.imageSmoothingEnabled = false;
  }

  game.updateScore = function () {
    this.scoreEl.textContent = this.score;
    this.linesEl.textContent = this.lines;
    if (this.levelEl) {
      this.levelEl.textContent = this.level;
    }
  };

  game.updateStatus = function (text) {
    this.statusEl.textContent = text;
  };

  game.spawnScoreBurst = function (basePoints, bonusPoints, bonusPercent) {
    if (!this.burstLayer) {
      return;
    }
    const layer = this.burstLayer;
    const vertical = Math.min(
      this.canvas.height - 40,
      Math.max(20, this.canvas.height * (0.2 + Math.random() * 0.6)),
    );
    const horizontal = this.side === 'right'
      ? this.canvas.width + 18
      : this.side === 'left'
      ? -120
      : this.canvas.width / 2 - 34;

    const createBurst = (text, extraClass, yOffset) => {
      const burst = document.createElement('div');
      burst.className = `score-burst ${extraClass} ${this.side || 'left'}`;
      burst.textContent = text;
      burst.style.top = `${Math.max(12, vertical + yOffset)}px`;
      burst.style.left = `${horizontal}px`;
      layer.appendChild(burst);
      requestAnimationFrame(() => {
        burst.classList.add('show');
      });
      setTimeout(() => {
        burst.remove();
      }, 1400);
    };

    createBurst(`+${basePoints}`, 'base', 0);
    if (bonusPoints > 0) {
      const bonusText = `+${bonusPoints} Bonus (${bonusPercent}%)`;
      createBurst(bonusText, 'bonus', 24);
    }
  };

  game.generateNextMatrix = function () {
    const piece = pieces[(pieces.length * Math.random()) | 0];
    return createPiece(piece);
  };

  game.drawPreview = function () {
    if (!this.previewContext || !this.previewCanvas) {
      return;
    }
    this.previewContext.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    if (!this.nextMatrix) {
      return;
    }
    const size = Math.min(this.previewCanvas.width, this.previewCanvas.height);
    if (!size) {
      return;
    }
    const bounds = getMatrixBounds(this.nextMatrix);
    const cellSize = size / 4;
    const offsetX = (this.previewCanvas.width - bounds.width * cellSize) / 2 - bounds.offsetX * cellSize;
    const offsetY = (this.previewCanvas.height - bounds.height * cellSize) / 2 - bounds.offsetY * cellSize;
    drawPreviewMatrix(this.previewContext, this.nextMatrix, { x: offsetX, y: offsetY }, cellSize);
  };

  game.draw = function () {
    this.context.fillStyle = '#000';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    drawMatrix(this.context, this.arena, { x: 0, y: 0 });
    if (this.player.matrix) {
      drawMatrix(this.context, this.player.matrix, this.player.pos);
    }
  };

  game.resetPlayer = function () {
    if (!this.nextMatrix) {
      this.nextMatrix = this.generateNextMatrix();
    }
    this.player.matrix = this.nextMatrix;
    this.nextMatrix = this.generateNextMatrix();
    this.player.pos.y = 0;
    this.player.pos.x = (this.arena[0].length / 2 | 0) - (this.player.matrix[0].length / 2 | 0);
    this.drawPreview();
    if (collide(this.arena, this.player)) {
      this.handleGameOver();
    }
  };

  game.handleLevelProgress = function () {
    let leveledUp = false;
    while (this.lines >= this.linesForNextLevel) {
      this.level += 1;
      this.linesForNextLevel += 10;
      leveledUp = true;
    }
    if (leveledUp) {
      this.dropInterval = calculateDropInterval(this.level);
      this.dropCounter = 0;
      showMessage(`${this.label} reached Level ${this.level}!`);
    }
    return leveledUp;
  };

  game.arenaSweep = function () {
    let rowCount = 0;
    outer: for (let y = this.arena.length - 1; y >= 0; --y) {
      for (let x = 0; x < this.arena[y].length; ++x) {
        if (this.arena[y][x] === 0) {
          continue outer;
        }
      }
      const row = this.arena.splice(y, 1)[0].fill(0);
      this.arena.unshift(row);
      ++rowCount;
      ++y;
    }
    if (rowCount > 0) {
      const basePoints = rowCount * 10;
      const bonusPercent = rowCount === 1 ? 0 : rowCount * 10;
      const bonusPoints = Math.round(basePoints * (bonusPercent / 100));
      const addition = basePoints + bonusPoints;
      this.score += addition;
      this.lines += rowCount;
      this.handleLevelProgress();
      playSound('clear');
      this.spawnScoreBurst(basePoints, bonusPoints, bonusPercent);
    }
    return rowCount;
  };

  game.lockPiece = function () {
    merge(this.arena, this.player);
    playSound('land');
    const cleared = this.arenaSweep();
    this.updateScore();
    if (this.modeType === 'duo-survival' && cleared > 0 && this.opponent && !this.opponent.over) {
      this.opponent.receiveGarbage(cleared);
    }
    if (this.over) {
      return;
    }
    this.resetPlayer();
  };

  game.playerDrop = function () {
    if (this.over || paused) {
      return;
    }
    this.player.pos.y++;
    if (collide(this.arena, this.player)) {
      this.player.pos.y--;
      this.lockPiece();
    }
    this.dropCounter = 0;
  };

  game.playerHardDrop = function () {
    if (this.over || paused) {
      return;
    }
    do {
      this.player.pos.y++;
    } while (!collide(this.arena, this.player));
    this.player.pos.y--;
    if (this.player.pos.y < 0) {
      this.player.pos.y = 0;
    }
    this.lockPiece();
    this.dropCounter = 0;
  };

  game.playerMove = function (dir) {
    if (this.over || paused) {
      return;
    }
    this.player.pos.x += dir;
    if (collide(this.arena, this.player)) {
      this.player.pos.x -= dir;
    }
  };

  game.playerRotate = function (dir) {
    if (this.over || paused) {
      return;
    }
    const pos = this.player.pos.x;
    let offset = 1;
    rotate(this.player.matrix, dir);
    while (collide(this.arena, this.player)) {
      this.player.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > this.player.matrix[0].length) {
        rotate(this.player.matrix, -dir);
        this.player.pos.x = pos;
        return;
      }
    }
  };

  game.receiveGarbage = function (count) {
    if (this.over) {
      return;
    }
    const width = this.arena[0].length;
    const rowsToAdd = Math.min(count, this.arena.length);
    for (let i = 0; i < rowsToAdd; i++) {
      this.arena.shift();
      const row = new Array(width).fill(8);
      const hole = (Math.random() * width) | 0;
      row[hole] = 0;
      this.arena.push(row);
    }
    this.player.pos.y = Math.max(0, this.player.pos.y - rowsToAdd);
    if (collide(this.arena, this.player)) {
      this.handleGameOver();
    } else {
      playSound('land');
    }
  };

  game.handleGameOver = function () {
    if (this.over) {
      return;
    }
    this.over = true;
    this.nextMatrix = null;
    this.drawPreview();
    if (this.modeType === 'duo-survival') {
      this.updateStatus('Defeated');
      if (this.opponent && !this.opponent.over) {
        this.opponent.handleSurvivalWin(this);
      } else {
        showMessage(`${this.label} has been overwhelmed!`);
      }
      return;
    }
    this.updateStatus('Game Over');
    showMessage(`${this.label} finished with ${this.score} points.`);
    saveLeaderboardEntry(this);
  };

  game.handleSurvivalWin = function (loser) {
    if (this.over) {
      return;
    }
    this.over = true;
    this.nextMatrix = null;
    this.drawPreview();
    this.updateStatus('Winner!');
    const foe = loser ? loser.label : 'opponent';
    showMessage(`${this.label} defeats ${foe} in survival mode!`);
  };

  game.start = function () {
    this.arena.forEach(row => row.fill(0));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.linesForNextLevel = 10;
    this.nextMatrix = null;
    this.over = false;
    this.dropCounter = 0;
    this.lastTime = 0;
    this.dropInterval = calculateDropInterval(this.level);
    this.startTime = Date.now();
    this.player.matrix = null;
    this.player.pos.x = 0;
    this.player.pos.y = 0;
    this.updateScore();
    this.updateStatus('Playing');
    this.drawPreview();
    this.resetPlayer();
    this.draw();
  };

  game.update = function (time) {
    if (this.over) {
      this.draw();
      return;
    }
    if (!this.lastTime) {
      this.lastTime = time;
    }
    if (paused) {
      this.lastTime = time;
      this.draw();
      return;
    }
    const delta = time - this.lastTime;
    this.lastTime = time;
    this.dropCounter += delta;
    if (this.dropCounter > this.dropInterval) {
      this.playerDrop();
    }
    this.draw();
  };

  return game;
}

function resetGames() {
  games.length = 0;
  gameArea.innerHTML = '';
  if (gameArea.classList) {
    gameArea.classList.add('hidden');
  }
  if (scoreboardLeft) {
    scoreboardLeft.innerHTML = '';
    scoreboardLeft.classList.add('hidden');
  }
  if (scoreboardRight) {
    scoreboardRight.innerHTML = '';
    scoreboardRight.classList.add('hidden');
  }
  if (playfieldLayout) {
    playfieldLayout.classList.add('hidden');
  }
  paused = false;
  if (controlsButton) {
    controlsButton.classList.add('hidden');
  }
  resetControlsOverlay();
}

function togglePause() {
  if (!games.length) {
    return;
  }
  const hasActiveGame = games.some(game => !game.over);
  if (!hasActiveGame) {
    showMessage('All games are finished. Press R to restart or change mode.');
    return;
  }
  paused = !paused;
  games.forEach(game => {
    if (!game.over) {
      game.updateStatus(paused ? 'Paused' : 'Playing');
    }
  });
  showMessage(paused ? 'Game paused. Press P to resume.' : 'Game resumed.');
}

function restartGames() {
  if (!games.length) {
    return;
  }
  paused = false;
  games.forEach(game => game.start());
  showMessage('Match restarted!');
}

function startMode(mode) {
  const config = getModeConfig(mode);
  if (!config) {
    return;
  }
  initAudio();
  clearMessage();
  resetGames();
  paused = false;

  if (controlsButton) {
    controlsButton.classList.remove('hidden');
  }
  configureControlsOverlay(config);

  config.players.forEach((playerConfig, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 400;
    const side = config.players.length === 2 ? (index === 0 ? 'left' : 'right') : 'right';
    const wrapper = document.createElement('div');
    wrapper.className = `playfield-wrapper ${side}`;
    wrapper.style.width = `${canvas.width}px`;
    wrapper.style.height = `${canvas.height}px`;
    const burstLayer = document.createElement('div');
    burstLayer.className = 'score-burst-layer';
    wrapper.appendChild(canvas);
    wrapper.appendChild(burstLayer);
    gameArea.appendChild(wrapper);

    const panel = document.createElement('div');
    panel.className = `player-panel player-${index + 1}`;
    panel.innerHTML = `
      <h3>${playerConfig.label}</h3>
      <div class="stat-line">Score: <span class="score">0</span></div>
      <div class="stat-line">Lines: <span class="lines">0</span></div>
      <div class="stat-line">Level: <span class="level">1</span></div>
      <div>Status: <span class="status">Ready</span></div>
      <div class="next-wrapper">
        <div class="next-label">Next</div>
        <canvas class="next" width="80" height="80"></canvas>
      </div>
    `;
    const targetColumn = index === 0 ? scoreboardLeft : scoreboardRight;
    if (targetColumn) {
      targetColumn.classList.remove('hidden');
      targetColumn.appendChild(panel);
    }

    const game = createGame({
      canvas,
      panel,
      controls: playerConfig.controls,
      label: playerConfig.label,
      modeType: mode,
      burstLayer,
      side,
    });
    games.push(game);
  });

  if (games.length === 2) {
    games[0].opponent = games[1];
    games[1].opponent = games[0];
  }

  games.forEach(game => game.start());

  modeSelect.classList.add('hidden');
  if (playfieldLayout) {
    playfieldLayout.classList.remove('hidden');
  }
  gameArea.classList.remove('hidden');
  changeModeBtn.classList.remove('hidden');
  changeModeBtn.disabled = false;
}

function handleKey(event) {
  initAudio();
  if (
    event.code === 'Escape' &&
    controlsOverlay &&
    !controlsOverlay.classList.contains('hidden')
  ) {
    event.preventDefault();
    hideControlsOverlay();
    return;
  }
  if (event.code === 'KeyP') {
    event.preventDefault();
    togglePause();
    return;
  }

  if (event.code === 'KeyR') {
    event.preventDefault();
    restartGames();
    return;
  }

  if (!games.length) {
    return;
  }
  games.forEach(game => {
    if (game.over) {
      return;
    }
    const action = game.keyMap[event.code];
    if (!action) {
      return;
    }
    event.preventDefault();
    if (action === 'left') {
      game.playerMove(-1);
    } else if (action === 'right') {
      game.playerMove(1);
    } else if (action === 'down') {
      game.playerDrop();
    } else if (action === 'rotateCW') {
      game.playerRotate(1);
    } else if (action === 'rotateCCW') {
      game.playerRotate(-1);
    } else if (action === 'hardDrop') {
      game.playerHardDrop();
    }
  });
}

document.addEventListener('keydown', handleKey);

modeSelect.querySelectorAll('button[data-mode]').forEach(button => {
  button.addEventListener('click', () => startMode(button.dataset.mode));
});

changeModeBtn.addEventListener('click', () => {
  resetGames();
  gameArea.classList.add('hidden');
  changeModeBtn.classList.add('hidden');
  changeModeBtn.disabled = true;
  clearMessage();
  modeSelect.classList.remove('hidden');
});

if (controlsButton) {
  controlsButton.addEventListener('click', () => {
    if (controlsOverlay) {
      controlsOverlay.classList.remove('hidden');
    }
  });
}

if (closeControlsBtn) {
  closeControlsBtn.addEventListener('click', hideControlsOverlay);
}

if (controlsOverlay) {
  controlsOverlay.addEventListener('click', event => {
    if (event.target === controlsOverlay) {
      hideControlsOverlay();
    }
  });
}

function globalUpdate(time = 0) {
  games.forEach(game => game.update(time));
  requestAnimationFrame(globalUpdate);
}

requestAnimationFrame(globalUpdate);
