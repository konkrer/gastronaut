from unittest import TestCase
from flask_app_template import app
from flask import session
import json


class FlaskTests(TestCase):

    def setUp(self):
        # create test client to serve responses
        self.client = app.test_client()
        # Make Flask errors be real errors, not HTML pages with error info
        app.config["TESTING"] = True
        # This is a bit of hack, but don't use Flask DebugToolbar
        app.config["DEBUG_TB_HOSTS"] = ["dont-show-debug-toolbar"]

    def test_index_view(self):
        with self.client:
            res = self.client.get("/")
            html = res.get_data(as_text=True)

            self.assertEqual(res.status_code, 200)
            self.assertEqual(session["high_score"], 0)
            self.assertIn("<h1>Boggle!</h1>", html)

    def test_word_check(self):
        with self.client:
            with self.client.session_transaction() as change_session:
                change_session['board'] = [1, 2, 3]

            res = self.client.get("/word-check?word=book")
            json_data = json.loads(res.get_data())

            self.assertEqual(res.status_code, 200)
            self.assertEqual(
                json_data, {"result": {"message": "ok", "_class": "success"}}
            )

    def test_end_score_fail(self):
        with self.client:
            # no get requests
            res = self.client.get("/end-score")
            self.assertEqual(res.status_code, 405)
            # no json data
            with self.assertRaises(TypeError):
                self.client.post("/end-score")
