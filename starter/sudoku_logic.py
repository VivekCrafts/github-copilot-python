import copy
import random

SIZE = 9
EMPTY = 0
# Number of clues to leave visible for each difficulty level.
DIFFICULTY_SETTINGS = {
    "easy": 40,
    "medium": 32,
    "hard": 24,
}


def deep_copy(board):
    return copy.deepcopy(board)


def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def is_safe(board, row, col, num):
    # Ensure the chosen value does not clash with the current row, column, or 3x3 box.
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True


def fill_board(board):
    # Recursively fill the board with a valid complete solution.
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def remove_cells(board, clues):
    attempts = SIZE * SIZE - clues
    while attempts > 0:
        row = random.randrange(SIZE)
        col = random.randrange(SIZE)
        if board[row][col] != EMPTY:
            board[row][col] = EMPTY
            attempts -= 1


def get_clues_for_difficulty(difficulty="medium"):
    difficulty_key = (difficulty or "medium").lower()
    return DIFFICULTY_SETTINGS.get(difficulty_key, DIFFICULTY_SETTINGS["medium"])


def generate_puzzle(clues=None, difficulty="medium"):
    # Build a full solution, remove clues to create the puzzle, and return both versions.
    if clues is None:
        clues = get_clues_for_difficulty(difficulty)
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, clues)
    puzzle = deep_copy(board)
    return puzzle, solution
