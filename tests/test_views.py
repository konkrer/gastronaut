"""Test basic views and view related functions."""

from unittest import TestCase
from werkzeug.datastructures import ImmutableMultiDict
# from flask import session
from app import app
from static.py_modules.yelp_helper import parse_query_params

# py -m unittest tests/test_views.py

# Make Flask errors be real errors, not HTML pages with error info
app.config["TESTING"] = True
# This is a bit of hack, but don't use Flask DebugToolbar
app.config["DEBUG_TB_HOSTS"] = ["dont-show-debug-toolbar"]


class ViewTests(TestCase):
    """Test basic views function."""

    def setUp(self):
        self.client = app.test_client()

    def test_index_view(self):
        with self.client:
            res = self.client.get("/")
            html = res.get_data(as_text=True)

            self.assertEqual(res.status_code, 200)
            self.assertIn("American (New)", html)


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
            'location': 'sf', 'open_at': '1594967400', 'sort_by': 'best_match',
            'radius': '30352', 'categories': 'restaurants', 'limit': '50',
            'price': '1,3,4', 'attributes': 'hot_and_new,deals'
        }

        self.assertEqual(parse_query_params(params),
                         converted_to_dict_for_yelp)
