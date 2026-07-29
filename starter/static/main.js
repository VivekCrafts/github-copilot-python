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
      input.dataset.row = i;
      input.dataset.col = j;

      // alternating 3x3 block class (A/B checkerboard: block-row % 2 === block-col % 2 -> A)
      const blockClass = (Math.floor(i / 3) % 2) === (Math.floor(j / 3) % 2) ? 'block-a' : 'block-b';
      input.className = `sudoku-cell ${blockClass}`;

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
      // Keep any block-* classes assigned at creation; toggle prefilled state.
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.classList.add('prefilled');
      } else {
        inp.value = '';
        inp.disabled = false;
        inp.classList.remove('prefilled');
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
  const tbody = document.querySelector('#leaderboard-table tbody');
  tbody.innerHTML = '';
  if (!scores.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No scores yet.';
    cell.style.padding = '20px';
    cell.style.color = '#5b6b8a';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  scores.forEach((entry, index) => {
    const row = document.createElement('tr');
    const hints = entry.hints_used || 0;
    const time = formatTime(entry.time || 0);
    const cells = [
      index + 1,
      entry.name || 'Anonymous',
      time,
      entry.difficulty || 'medium',
      hints,
    ];
    cells.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
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
  // Sort by time, then hints used, then name to match server-side ordering.
  scores.sort((a, b) => {
    const t = a.time - b.time;
    if (t !== 0) return t;
    const h = (a.hints_used || 0) - (b.hints_used || 0);
    if (h !== 0) return h;
    return (a.name || '').localeCompare(b.name || '');
  });
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
    // Preserve block classes and mark prefilled instead of overwriting className
    inp.classList.add('prefilled');
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

function updateCellHighlights(incorrect, inputs, includeDisabled = false) {
  const incorrectSet = new Set(incorrect.map(x => x[0] * SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    // Skip disabled cells during live-only validation unless includeDisabled is true
    if (!includeDisabled && inp.disabled) continue;

    // remove only the incorrect marker, preserve block-* and prefilled classes
    inp.classList.remove('incorrect');

    if (incorrectSet.has(idx)) {
      inp.classList.add('incorrect');
    }
  }
}

function findConflicts(board) {
  const conflicts = new Set();

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (!v) continue;

      // Check row
      for (let cc = 0; cc < SIZE; cc++) {
        if (cc === c) continue;
        if (board[r][cc] === v) {
          conflicts.add(r * SIZE + c);
          conflicts.add(r * SIZE + cc);
        }
      }

      // Check column
      for (let rr = 0; rr < SIZE; rr++) {
        if (rr === r) continue;
        if (board[rr][c] === v) {
          conflicts.add(r * SIZE + c);
          conflicts.add(rr * SIZE + c);
        }
      }

      // Check 3x3 box
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          if (rr === r && cc === c) continue;
          if (board[rr][cc] === v) {
            conflicts.add(r * SIZE + c);
            conflicts.add(rr * SIZE + cc);
          }
        }
      }
    }
  }

  return Array.from(conflicts).map(idx => [Math.floor(idx / SIZE), idx % SIZE]);
}

async function checkBoardLive() {
  // Perform client-side rule validation (rows, columns, 3x3 boxes).
  const {board, inputs} = getBoardFromInputs();
  const conflicts = findConflicts(board);
  updateCellHighlights(conflicts, inputs);
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
  updateCellHighlights(data.incorrect, inputs, true);
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