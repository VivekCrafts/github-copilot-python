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


if __name__ == '__main__':
    unittest.main()
