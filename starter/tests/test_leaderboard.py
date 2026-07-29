import unittest

from app import app


class LeaderboardTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        app.LEADERBOARD.clear()

    def test_submit_and_get_scores(self):
        response = self.client.post('/score', json={
            'name': 'Ada',
            'time': 45,
            'difficulty': 'easy'
        })
        self.assertEqual(response.status_code, 200)

        leaderboard_response = self.client.get('/leaderboard')
        self.assertEqual(leaderboard_response.status_code, 200)
        data = leaderboard_response.get_json()
        self.assertEqual(len(data['scores']), 1)
        self.assertEqual(data['scores'][0]['name'], 'Ada')
        self.assertEqual(data['scores'][0]['time'], 45)

    def test_score_accepts_hints_used_and_limits_to_top_ten(self):
        for index in range(11):
            response = self.client.post('/score', json={
                'name': f'Player{index}',
                'time': 100 + index,
                'difficulty': 'hard',
                'hints_used': index
            })
            self.assertEqual(response.status_code, 200)

        leaderboard_response = self.client.get('/leaderboard')
        self.assertEqual(leaderboard_response.status_code, 200)
        data = leaderboard_response.get_json()
        self.assertEqual(len(data['scores']), 10)
        self.assertEqual(data['scores'][0]['name'], 'Player0')
        self.assertEqual(data['scores'][0]['hints_used'], 0)


if __name__ == '__main__':
    unittest.main()
