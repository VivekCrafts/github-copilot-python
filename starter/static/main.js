// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
// Local storage keys for persistence across page refreshes.
const LEADERBOARD_STORAGE_KEY = 'sudoku-leaderboard';
const DARK_MODE_STORAGE_KEY = 'sudoku-dark-mode';
let puzzle = [];
let timerInterval = null;
let elapsedSeconds = 0;
let scoreSaved = false;
let liveCheckTimeout = null;
let isDarkMode = false;
let hintsUsed = 0;

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
  // Build the interactive board UI from scratch for each new puzzle.
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
        inp.className = 'sudoku-cell prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
        inp.className = 'sudoku-cell';
      }
    }
  }
}

async function newGame() {
  // Request a new puzzle and reset the timer and hint tracking for the round.
  const difficulty = document.getElementById('difficulty-select').value;
  const res = await fetch(`/new?difficulty=${encodeURIComponent(difficulty)}`);
  const data = await res.json();
  renderPuzzle(data.puzzle);
  document.getElementById('message').innerText = '';
  scoreSaved = false;
  hintsUsed = 0;
  startTimer();
}

function getStoredLeaderboard() {
  const stored = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
}

function renderLeaderboard(scores) {
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '';
  if (!scores.length) {
    const item = document.createElement('li');
    item.textContent = 'No scores yet.';
    list.appendChild(item);
    return;
  }
  scores.forEach((entry, index) => {
    const item = document.createElement('li');
    item.textContent = `${index + 1}. ${entry.name} — ${entry.time}s (${entry.difficulty})`;
    list.appendChild(item);
  });
}

async function loadLeaderboard() {
  const scores = getStoredLeaderboard();
  renderLeaderboard(scores);
}

function saveLeaderboardEntry(entry) {
  // Keep the best 10 entries locally so the leaderboard survives page refreshes.
  const scores = getStoredLeaderboard();
  scores.push(entry);
  scores.sort((a, b) => a.time - b.time || a.name.localeCompare(b.name));
  const topScores = scores.slice(0, 10);
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(topScores));
  renderLeaderboard(topScores);
}

async function saveScore() {
  // Persist a completed game automatically once the board is solved.
  if (scoreSaved) {
    return;
  }
  const name = document.getElementById('player-name').value.trim() || 'Anonymous';
  const difficulty = document.getElementById('difficulty-select').value;
  const entry = {name, time: elapsedSeconds, difficulty, hints_used: hintsUsed};
  saveLeaderboardEntry(entry);
  scoreSaved = true;
  try {
    await fetch('/score', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(entry)
    });
  } catch (error) {
    // Keep local storage persistence even if the server is unavailable.
  }
}

async function getHint() {
  // Request one solved cell from the server and reveal it in the board.
  const res = await fetch('/hint');
  const data = await res.json();
  if (data.error) {
    document.getElementById('message').innerText = data.error;
    return;
  }

  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const idx = data.row * SIZE + data.col;
  const inp = inputs[idx];
  if (inp) {
    inp.value = data.value;
    inp.disabled = true;
    inp.className = 'sudoku-cell prefilled';
  }
  hintsUsed += 1;
  document.getElementById('message').innerText = 'Hint used.';
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

function applyDarkMode() {
  // Toggle the full-page theme class so the UI updates instantly.
  document.body.classList.toggle('dark', isDarkMode);
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
  }
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  localStorage.setItem(DARK_MODE_STORAGE_KEY, String(isDarkMode));
  applyDarkMode();
}

function loadDarkModePreference() {
  const storedValue = localStorage.getItem(DARK_MODE_STORAGE_KEY);
  if (storedValue === 'true') {
    isDarkMode = true;
  } else {
    isDarkMode = false;
  }
  applyDarkMode();
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint-button').addEventListener('click', getHint);
  document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
  loadDarkModePreference();
  loadLeaderboard();
  // initialize
  newGame();
});