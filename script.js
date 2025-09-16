const colors = [
  null,
  '#8d8f91',
  '#b22222',
  '#556b2f',
  '#483d8b',
  '#708090',
  '#a9a9a9',
  '#2f4f4f',
  '#3b3b3b',
];

const pieces = 'TJLOSZI';

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

function drawMatrix(context, matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const xPos = x + offset.x;
        const yPos = y + offset.y;
        const gradient = context.createLinearGradient(xPos, yPos, xPos + 1, yPos + 1);
        gradient.addColorStop(0, '#444');
        gradient.addColorStop(0.5, colors[value]);
        gradient.addColorStop(1, '#ddd');
        context.fillStyle = gradient;
        context.fillRect(xPos, yPos, 1, 1);
        context.strokeStyle = '#303030';
        context.lineWidth = 0.05;
        context.strokeRect(xPos, yPos, 1, 1);
        context.strokeStyle = 'rgba(180, 180, 180, 0.35)';
        context.lineWidth = 0.02;
        context.beginPath();
        context.moveTo(xPos + 0.5, yPos);
        context.lineTo(xPos + 0.5, yPos + 1);
        context.moveTo(xPos, yPos + 0.5);
        context.lineTo(xPos + 1, yPos + 0.5);
        context.stroke();
      }
    });
  });
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
const gameArea = document.getElementById('gameArea');
const scoreboard = document.getElementById('scoreboard');
const changeModeBtn = document.getElementById('changeMode');
const message = document.getElementById('message');
const leaderboard = document.getElementById('leaderboard');
const leadersList = document.getElementById('leaders');

const games = [];
let messageTimeout = null;
let leaderboardTimeout = null;
let audioContext = null;

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

function playSound(type) {
  if (!audioContext || audioContext.state !== 'running') {
    return;
  }
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);

  let frequency = 220;
  let duration = 0.12;
  if (type === 'clear') {
    frequency = 460;
    duration = 0.25;
  } else if (type === 'land') {
    frequency = 180;
    duration = 0.1;
  }

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.35, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

  osc.start();
  osc.stop(audioContext.currentTime + duration + 0.03);
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

function createGame({ canvas, panel, controls, label, modeType }) {
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
    dropInterval: 1000,
    lastTime: 0,
    score: 0,
    lines: 0,
    over: false,
    startTime: Date.now(),
    label,
    modeType,
    survival: modeType === 'duo-survival',
    opponent: null,
    keyMap: buildKeyMap(controls),
    panel,
  };

  game.scoreEl = panel.querySelector('.score');
  game.linesEl = panel.querySelector('.lines');
  game.statusEl = panel.querySelector('.status');

  game.updateScore = function () {
    this.scoreEl.textContent = this.score;
    this.linesEl.textContent = this.lines;
  };

  game.updateStatus = function (text) {
    this.statusEl.textContent = text;
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
    const piece = pieces[(pieces.length * Math.random()) | 0];
    this.player.matrix = createPiece(piece);
    this.player.pos.y = 0;
    this.player.pos.x = (this.arena[0].length / 2 | 0) - (this.player.matrix[0].length / 2 | 0);
    if (collide(this.arena, this.player)) {
      this.handleGameOver();
    }
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
      let addition = 0;
      let points = 10;
      for (let i = 0; i < rowCount; i++) {
        addition += points;
        points *= 2;
      }
      this.score += addition;
      this.lines += rowCount;
      playSound('clear');
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
    if (this.over) {
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
    if (this.over) {
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
    if (this.over) {
      return;
    }
    this.player.pos.x += dir;
    if (collide(this.arena, this.player)) {
      this.player.pos.x -= dir;
    }
  };

  game.playerRotate = function (dir) {
    if (this.over) {
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
    this.updateStatus('Winner!');
    const foe = loser ? loser.label : 'opponent';
    showMessage(`${this.label} defeats ${foe} in survival mode!`);
  };

  game.start = function () {
    this.arena.forEach(row => row.fill(0));
    this.score = 0;
    this.lines = 0;
    this.over = false;
    this.dropCounter = 0;
    this.lastTime = 0;
    this.startTime = Date.now();
    this.updateScore();
    this.updateStatus('Playing');
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
  scoreboard.innerHTML = '';
}

function startMode(mode) {
  const config = getModeConfig(mode);
  if (!config) {
    return;
  }
  initAudio();
  clearMessage();
  resetGames();

  config.players.forEach(playerConfig => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 400;
    gameArea.appendChild(canvas);

    const panel = document.createElement('div');
    panel.className = 'player-panel';
    panel.innerHTML = `
      <h3>${playerConfig.label}</h3>
      <div>Score: <span class="score">0</span></div>
      <div>Lines: <span class="lines">0</span></div>
      <div>Status: <span class="status">Ready</span></div>
    `;
    scoreboard.appendChild(panel);

    const game = createGame({
      canvas,
      panel,
      controls: playerConfig.controls,
      label: playerConfig.label,
      modeType: mode,
    });
    games.push(game);
  });

  if (games.length === 2) {
    games[0].opponent = games[1];
    games[1].opponent = games[0];
  }

  games.forEach(game => game.start());

  modeSelect.classList.add('hidden');
  gameArea.classList.remove('hidden');
  changeModeBtn.classList.remove('hidden');
  changeModeBtn.disabled = false;
}

function handleKey(event) {
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

function globalUpdate(time = 0) {
  games.forEach(game => game.update(time));
  requestAnimationFrame(globalUpdate);
}

requestAnimationFrame(globalUpdate);
