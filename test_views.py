"""Test views and view related functions."""

from unittest import TestCase
from types import SimpleNamespace
from werkzeug.datastructures import ImmutableMultiDict
# from flask import session
import json
from app import app, get_coords_from_IP_address
from static.py_modules.yelp_helper import parse_query_params

# py -m unittest test_views.py

# Make Flask errors be real errors, not HTML pages with error info
app.config["TESTING"] = True
# This is a bit of hack, but don't use Flask DebugToolbar
app.config["DEBUG_TB_HOSTS"] = ["dont-show-debug-toolbar"]


class ViewTests(TestCase):

    def setUp(self):
        self.client = app.test_client()

    def test_index_view(self):
        with self.client:
            res = self.client.get("/")
            html = res.get_data(as_text=True)

            self.assertEqual(res.status_code, 200)
            self.assertIn("American (New)", html)


class APITests(TestCase):

    def setUp(self):
        self.client = app.test_client()

    def test_search_yelp(self):

        resp = self.client.get('/v1/search?location=sf&category=restaurants')
        data = json.loads(resp.get_data())

        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(data, dict)

    def test_get_coords_from_IP_address(self):

        fake_request = SimpleNamespace(
            environ={'HTTP_X_FORWARDED_FOR': '127.0.0.1'}, remote_addr=1
        )

        lat, lng = get_coords_from_IP_address(fake_request)
        # these are the default coords that are returned from
        # ipwhois for the localhost address.
        self.assertEqual(lat, '35.7090259')
        self.assertEqual(lng, '139.7319925')


class FunctionTests(TestCase):

    def test_parse_query_params(self):

        params = ImmutableMultiDict([
            ('location', 'sf'), ('term', ''), ('open_at', '2020-07-16T23:30'),
            ('price-1', '1'), ('price-3', '3'), ('price-4', '4'),
            ('sort_by', 'best_match'), ('radius', '30352'),
            ('hot_and_new', 'true'), ('deals', 'true'),
            ('categories', 'restaurants'), ('limit', '50'),
            ('latitude', '37.761'), ('longitude', '-122.436')
        ])

        converted_to_dict_for_yelp = {
            'location': 'sf', 'open_at': '1594942200', 'sort_by': 'best_match',
            'radius': '30352', 'categories': 'restaurants', 'limit': '50',
            'price': '1,3,4', 'attributes': 'hot_and_new,deals'
        }
        # import pdb
        # pdb.set_trace()

        self.assertEqual(parse_query_params(params),
                         converted_to_dict_for_yelp)

    # def test_search_yelp(self):
    #     with self.client:
    #         with self.client.session_transaction() as change_session:
    #             change_session['board'] = [1, 2, 3]

    #         res = self.client.get("/word-check?word=book")
    #         json_data = json.loads(res.get_data())

    #         self.assertEqual(res.status_code, 200)
    #         self.assertEqual(
    #             json_data, {"result": {"message": "ok", "_class": "success"}}
    #         )

    # def test_end_score_fail(self):
    #     with self.client:
    #         # no get requests
    #         res = self.client.get("/end-score")
    #         self.assertEqual(res.status_code, 405)
    #         # no json data
    #         with self.assertRaises(TypeError):
    #             self.client.post("/end-score")
