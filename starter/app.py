from flask import Flask, render_template, jsonify, request
import sudoku_logic

app = Flask(__name__)

# Stores the active puzzle and its solved board for the current session.
CURRENT = {
    'puzzle': None,
    'solution': None
}

app.CURRENT = CURRENT

# Simple in-memory leaderboard storage for completed games.
app.LEADERBOARD = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    # Generate a fresh puzzle for the selected difficulty and keep it in memory.
    difficulty = request.args.get('difficulty', 'medium')
    puzzle, solution = sudoku_logic.generate_puzzle(difficulty=difficulty)
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    return jsonify({'puzzle': puzzle, 'difficulty': difficulty})

@app.route('/check', methods=['POST'])
def check_solution():
    # Compare the player's board against the solved board and report incorrect cells.
    data = request.json
    board = data.get('board')
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})


@app.route('/score', methods=['POST'])
def submit_score():
    # Record a completed game result with the player's name, time, difficulty, and hints used.
    data = request.json or {}
    name = (data.get('name') or '').strip() or 'Anonymous'
    time_taken = int(data.get('time', 0))
    difficulty = (data.get('difficulty') or 'medium').lower()

    hints_used = int(data.get('hints_used', 0))

    entry = {
        'name': name,
        'time': time_taken,
        'difficulty': difficulty,
        'hints_used': hints_used,
    }
    app.LEADERBOARD.append(entry)
    app.LEADERBOARD.sort(key=lambda item: (item['time'], item['hints_used'], item['name'].lower()))
    app.LEADERBOARD = app.LEADERBOARD[:10]
    return jsonify({'status': 'ok', 'scores': app.LEADERBOARD})


@app.route('/leaderboard')
def get_leaderboard():
    return jsonify({'scores': app.LEADERBOARD[:10]})


@app.route('/hint')
def get_hint():
    # Reveal one correct cell from the current puzzle so the player can progress.
    solution = CURRENT.get('solution')
    puzzle = CURRENT.get('puzzle')
    if not solution or not puzzle:
        return jsonify({'error': 'No game in progress'}), 400

    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if puzzle[row][col] == 0:
                puzzle[row][col] = solution[row][col]
                return jsonify({'row': row, 'col': col, 'value': solution[row][col]})

    return jsonify({'error': 'No empty cells left'}), 400


if __name__ == '__main__':
    app.run(debug=True)