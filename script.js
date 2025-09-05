const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

let score = 0;
let startTime = Date.now();

function updateScore() {
  document.getElementById('score').innerText = score;
}

function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    score += rowCount * 10;
    rowCount *= 2;
  }
  updateScore();
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

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  if (type === 'T') {
    return [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ];
  } else if (type === 'O') {
    return [
      [2, 2],
      [2, 2],
    ];
  } else if (type === 'L') {
    return [
      [0, 3, 0],
      [0, 3, 0],
      [0, 3, 3],
    ];
  } else if (type === 'J') {
    return [
      [0, 4, 0],
      [0, 4, 0],
      [4, 4, 0],
    ];
  } else if (type === 'I') {
    return [
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
    ];
  } else if (type === 'S') {
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ];
  } else if (type === 'Z') {
    return [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0],
    ];
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const xPos = x + offset.x;
        const yPos = y + offset.y;
        const gradient = context.createLinearGradient(xPos, yPos, xPos + 1, yPos + 1);
        gradient.addColorStop(0, '#555');
        gradient.addColorStop(0.5, colors[value]);
        gradient.addColorStop(1, '#eee');
        context.fillStyle = gradient;
        context.fillRect(xPos, yPos, 1, 1);
        context.strokeStyle = '#444';
        context.lineWidth = 0.05;
        context.strokeRect(xPos, yPos, 1, 1);
        context.strokeStyle = '#777';
        context.lineWidth = 0.01;
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

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
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

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function playerReset() {
  const pieces = 'TJLOSZI';
  player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
  player.pos.y = 0;
  player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
  if (collide(arena, player)) {
    gameOver();
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;
function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

function gameOver() {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const name = prompt('Game Over! Enter your name:');
  const entry = {
    name: name || 'Anonymous',
    score,
    date: new Date().toLocaleDateString(),
    duration,
  };
  const board = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  localStorage.setItem('leaderboard', JSON.stringify(board.slice(0, 3)));
  renderLeaderboard();
  arena.forEach(row => row.fill(0));
  score = 0;
  updateScore();
  startTime = Date.now();
}

function renderLeaderboard() {
  const list = document.getElementById('leaders');
  list.innerHTML = '';
  const board = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  board.slice(0, 3).forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name} - ${item.score} - ${item.duration}s - ${item.date}`;
    list.appendChild(li);
  });
  const lb = document.getElementById('leaderboard');
  lb.classList.remove('hidden');
  setTimeout(() => lb.classList.add('hidden'), 5000);
}

document.addEventListener('keydown', event => {
  if (event.keyCode === 37) {
    playerMove(-1);
  } else if (event.keyCode === 39) {
    playerMove(1);
  } else if (event.keyCode === 40) {
    playerDrop();
  } else if (event.keyCode === 81) {
    playerRotate(-1);
  } else if (event.keyCode === 87 || event.keyCode === 38) {
    playerRotate(1);
  }
});

const colors = [
  null,
  '#8d8f91',
  '#b22222',
  '#556b2f',
  '#483d8b',
  '#708090',
  '#a9a9a9',
  '#2f4f4f',
];

const arena = createMatrix(12, 20);
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
};

function startGame() {
  startTime = Date.now();
  playerReset();
  updateScore();
  update();
}

startGame();
