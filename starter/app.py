from flask import Flask, render_template, jsonify, request
import sudoku_logic

app = Flask(__name__)

CURRENT_GAME = {'puzzle': None, 'solution': None}
LEADERBOARD = []

# Expose objects for tests that rely on app.CURRENT and app.LEADERBOARD.
app.CURRENT = CURRENT_GAME
app.LEADERBOARD = LEADERBOARD

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', 'medium').lower()
    puzzle, solution = sudoku_logic.generate_puzzle(difficulty=difficulty)
    CURRENT_GAME['puzzle'] = puzzle
    CURRENT_GAME['solution'] = solution
    return jsonify({'puzzle': puzzle, 'difficulty': difficulty})

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.get_json(silent=True) or {}
    board = data.get('board')
    solution = CURRENT_GAME.get('solution')

    if solution is None or board is None:
        return jsonify({'error': 'No game in progress'}), 400

    incorrect = []
    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if board[row][col] != solution[row][col]:
                incorrect.append([row, col])
    return jsonify({'incorrect': incorrect})


@app.route('/score', methods=['POST'])
def submit_score():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip() or 'Anonymous'
    time_taken = int(data.get('time', 0) or 0)
    difficulty = (data.get('difficulty') or 'medium').lower()
    hints_used = int(data.get('hints_used', 0) or 0)

    entry = {
        'name': name,
        'time': time_taken,
        'difficulty': difficulty,
        'hints_used': hints_used,
    }
    LEADERBOARD.append(entry)
    LEADERBOARD.sort(key=lambda item: (item['time'], item['hints_used'], item['name'].lower()))
    return jsonify({'status': 'ok', 'scores': LEADERBOARD[:10]})


@app.route('/leaderboard')
def get_leaderboard():
    return jsonify({'scores': LEADERBOARD[:10]})


@app.route('/hint')
def get_hint():
    puzzle = CURRENT_GAME.get('puzzle')
    solution = CURRENT_GAME.get('solution')

    if puzzle is None or solution is None:
        return jsonify({'error': 'No game in progress'}), 400

    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if puzzle[row][col] == 0:
                puzzle[row][col] = solution[row][col]
                return jsonify({'row': row, 'col': col, 'value': solution[row][col]})

    return jsonify({'error': 'No empty cells left'}), 400


if __name__ == '__main__':
    app.run(debug=True)