import copy
import random

SIZE = 9
EMPTY = 0
DIFFICULTY_SETTINGS = {
    'easy': 40,
    'medium': 32,
    'hard': 24,
}


def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def copy_board(board):
    return copy.deepcopy(board)


def row_values(board, row):
    return set(board[row]) - {EMPTY}


def col_values(board, col):
    return {board[row][col] for row in range(SIZE)} - {EMPTY}


def box_values(board, row, col):
    start_row = (row // 3) * 3
    start_col = (col // 3) * 3
    values = set()
    for r in range(start_row, start_row + 3):
        for c in range(start_col, start_col + 3):
            if board[r][c] != EMPTY:
                values.add(board[r][c])
    return values


def is_valid_move(board, row, col, value):
    if value == EMPTY:
        return True
    if value in row_values(board, row):
        return False
    if value in col_values(board, col):
        return False
    if value in box_values(board, row, col):
        return False
    return True


def find_empty_cell(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                return row, col
    return None, None


def solve_board(board, limit=2):
    row, col = find_empty_cell(board)
    if row is None:
        return 1

    count = 0
    for candidate in range(1, SIZE + 1):
        if is_valid_move(board, row, col, candidate):
            board[row][col] = candidate
            count += solve_board(board, limit)
            board[row][col] = EMPTY
            if count >= limit:
                return count
    return count


def count_solutions(board, limit=2):
    return solve_board(copy_board(board), limit)


def fill_board(board):
    row, col = find_empty_cell(board)
    if row is None:
        return True

    numbers = list(range(1, SIZE + 1))
    random.shuffle(numbers)
    for value in numbers:
        if is_valid_move(board, row, col, value):
            board[row][col] = value
            if fill_board(board):
                return True
            board[row][col] = EMPTY
    return False


def get_clues_for_difficulty(difficulty='medium'):
    return DIFFICULTY_SETTINGS.get((difficulty or 'medium').lower(), DIFFICULTY_SETTINGS['medium'])


def generate_puzzle(clues=None, difficulty='medium'):
    if clues is None:
        clues = get_clues_for_difficulty(difficulty)

    board = create_empty_board()
    fill_board(board)
    solution = copy_board(board)

    cells = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(cells)
    removals = SIZE * SIZE - clues

    for row, col in cells:
        if removals <= 0:
            break
        saved = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(board, limit=2) != 1:
            board[row][col] = saved
        else:
            removals -= 1

    return copy_board(board), solution
