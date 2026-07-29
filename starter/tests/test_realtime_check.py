import unittest

from app import app


class RealTimeCheckTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        app.CURRENT['solution'] = [[1, 2, 3, 4, 5, 6, 7, 8, 9] for _ in range(9)]
        app.CURRENT['puzzle'] = [[0 for _ in range(9)] for _ in range(9)]

    def test_check_endpoint_returns_incorrect_cells(self):
        response = self.client.post('/check', json={
            'board': [[1, 2, 3, 4, 5, 6, 7, 8, 9] for _ in range(9)]
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['incorrect'], [])


if __name__ == '__main__':
    unittest.main()
