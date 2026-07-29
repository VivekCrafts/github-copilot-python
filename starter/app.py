from flask import Flask, render_template, jsonify, request
import sudoku_logic

app = Flask(__name__)

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None
}

# Simple in-memory leaderboard storage
app.LEADERBOARD = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', 'medium')
    puzzle, solution = sudoku_logic.generate_puzzle(difficulty=difficulty)
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    return jsonify({'puzzle': puzzle, 'difficulty': difficulty})

@app.route('/check', methods=['POST'])
def check_solution():
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
    data = request.json or {}
    name = (data.get('name') or '').strip() or 'Anonymous'
    time_taken = int(data.get('time', 0))
    difficulty = (data.get('difficulty') or 'medium').lower()

    entry = {
        'name': name,
        'time': time_taken,
        'difficulty': difficulty,
    }
    app.LEADERBOARD.append(entry)
    app.LEADERBOARD.sort(key=lambda item: (item['time'], item['name'].lower()))
    return jsonify({'status': 'ok', 'scores': app.LEADERBOARD[:10]})


@app.route('/leaderboard')
def get_leaderboard():
    return jsonify({'scores': app.LEADERBOARD[:10]})


if __name__ == '__main__':
    app.run(debug=True)