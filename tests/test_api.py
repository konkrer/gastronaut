"""Tests for Gastronaut models."""

from types import SimpleNamespace
from unittest import TestCase
from app import app, get_coords_from_IP_address
from models import (db, User, DEFAULT_USER_IMAGE, Mission, Business,
                    Report, UserMission, MissionBusiness)


# Use test database and don't clutter tests with SQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///gastronaut_test'
app.config['SQLALCHEMY_ECHO'] = False

# Make Flask errors be real errors, rather than HTML pages with error info
app.config['TESTING'] = False

# This is a bit of hack, but don't use Flask DebugToolbar
app.config['DEBUG_TB_HOSTS'] = ['dont-show-debug-toolbar']


db.drop_all()
db.create_all()

# py -m unittest tests/test_api.py


class APIViewTests(TestCase):

    def setUp(self):
        self.client = app.test_client()

    def test_search_yelp(self):
        """Test reaching the Yelp API for data."""

        resp = self.client.get('/v1/search?location=sf&category=restaurants')
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(data, dict)
        self.assertIn('businesses', data)

    def test_get_coords_from_IP_address(self):
        """Test reaching the IPWhois API for data."""

        fake_request = SimpleNamespace(
            environ={'HTTP_X_FORWARDED_FOR': '127.0.0.1'}, remote_addr=1
        )

        lat, lng = get_coords_from_IP_address(fake_request)

        float(lat)
        float(lng)

    def test_set_preferences(self):
        """Test set preferences endpoint."""

        u1 = User.register(email='test@test.com',
                           username='tester1', password='tester1')

        with app.test_client() as c:
            with c.session_transaction() as sess:
                sess['user_id'] = u1.id
            c.post('/v1/preferences', json={'show_alcohol': False})

        u1 = User.query.get(u1.id)

        self.assertFalse(u1.preferences.show_alcohol)
