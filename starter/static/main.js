// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let timerInterval = null;
let elapsedSeconds = 0;
let scoreSaved = false;
let liveCheckTimeout = null;

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('timer');
  if (timerEl) {
    timerEl.textContent = `Time: ${formatTime(elapsedSeconds)}`;
  }
}

function startTimer() {
  stopTimer();
  elapsedSeconds = 0;
  updateTimerDisplay();
  timerInterval = window.setInterval(() => {
    elapsedSeconds += 1;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
        if (liveCheckTimeout) {
          window.clearTimeout(liveCheckTimeout);
        }
        liveCheckTimeout = window.setTimeout(() => {
          checkBoardLive();
        }, 150);
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
}

async function newGame() {
  const difficulty = document.getElementById('difficulty-select').value;
  const res = await fetch(`/new?difficulty=${encodeURIComponent(difficulty)}`);
  const data = await res.json();
  renderPuzzle(data.puzzle);
  document.getElementById('message').innerText = '';
  scoreSaved = false;
  startTimer();
}

async function loadLeaderboard() {
  const res = await fetch('/leaderboard');
  const data = await res.json();
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '';
  if (!data.scores.length) {
    const item = document.createElement('li');
    item.textContent = 'No scores yet.';
    list.appendChild(item);
    return;
  }
  data.scores.forEach((entry, index) => {
    const item = document.createElement('li');
    item.textContent = `${index + 1}. ${entry.name} — ${entry.time}s (${entry.difficulty})`;
    list.appendChild(item);
  });
}

async function saveScore() {
  if (scoreSaved) {
    return;
  }
  const name = document.getElementById('player-name').value.trim() || 'Anonymous';
  const difficulty = document.getElementById('difficulty-select').value;
  const res = await fetch('/score', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name, time: elapsedSeconds, difficulty})
  });
  const data = await res.json();
  if (data.status === 'ok') {
    scoreSaved = true;
    await loadLeaderboard();
  }
}

function getBoardFromInputs() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  return {board, inputs};
}

function updateCellHighlights(incorrect, inputs) {
  const incorrectSet = new Set(incorrect.map(x => x[0] * SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.className = 'sudoku-cell';
    if (incorrectSet.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
}

async function checkBoardLive() {
  const {board, inputs} = getBoardFromInputs();
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  if (data.error) {
    return;
  }
  updateCellHighlights(data.incorrect, inputs);
}

async function checkSolution() {
  const {board, inputs} = getBoardFromInputs();
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  updateCellHighlights(data.incorrect, inputs);
  if (data.incorrect.length === 0) {
    stopTimer();
    msg.style.color = '#388e3c';
    msg.innerText = `Congratulations! You solved it in ${formatTime(elapsedSeconds)}.`;
    await saveScore();
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('save-score').addEventListener('click', saveScore);
  loadLeaderboard();
  // initialize
  newGame();
});