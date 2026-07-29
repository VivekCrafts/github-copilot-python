import unittest

from sudoku_logic import count_solutions, generate_puzzle


class DifficultyTests(unittest.TestCase):
    def test_generate_puzzle_accepts_difficulty(self):
        puzzle, solution = generate_puzzle(difficulty="easy")
        self.assertEqual(len(puzzle), 9)
        self.assertEqual(len(solution), 9)
        self.assertEqual(len(puzzle[0]), 9)
        self.assertEqual(len(solution[0]), 9)

    def test_generate_puzzle_supports_multiple_difficulties(self):
        easy_puzzle, easy_solution = generate_puzzle(difficulty="easy")
        medium_puzzle, medium_solution = generate_puzzle(difficulty="medium")
        hard_puzzle, hard_solution = generate_puzzle(difficulty="hard")

        self.assertTrue(any(cell != 0 for row in easy_puzzle for cell in row))
        self.assertTrue(any(cell != 0 for row in medium_puzzle for cell in row))
        self.assertTrue(any(cell != 0 for row in hard_puzzle for cell in row))

        self.assertEqual(len(easy_solution), 9)
        self.assertEqual(len(medium_solution), 9)
        self.assertEqual(len(hard_solution), 9)

    def test_generate_puzzle_has_unique_solution(self):
        puzzle, _ = generate_puzzle(difficulty="medium")
        self.assertEqual(count_solutions(puzzle, limit=2), 1)


if __name__ == "__main__":
    unittest.main()
