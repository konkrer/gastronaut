from unittest import TestCase
from app import app
from models import db, User, Mission, UserMission

# py -m unittest tests/test_sql_view.py

# Use test database and don't clutter tests with SQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///gastronaut_test'
app.config['SQLALCHEMY_ECHO'] = False

# Make Flask errors be real errors, rather than HTML pages with error info
app.config['TESTING'] = False

# This is a bit of hack, but don't use Flask DebugToolbar
app.config['DEBUG_TB_HOSTS'] = ['dont-show-debug-toolbar']

# Disable CRSF for tests
app.config['WTF_CSRF_ENABLED'] = False

db.drop_all()
db.create_all()


class UserViewsTestCase(TestCase):
    """Tests for user creation, editing, deleting."""

    def setUp(self):

        self.client = app.test_client()

        self.user = User.register(email="test@test.com",
                                  username="tester1", password="tester1$A")

    def tearDown(self):

        db.session.rollback()
        UserMission.query.delete()
        Mission.query.delete()
        User.query.delete()

    def test_signup_view(self):

        form_data = {'email': 'tester2@test.com',
                     'username': 'tester2', 'password': 'tester2$A'}

        with self.client as c:
            resp = c.post('/signup', data=form_data,
                          follow_redirects=True)

        html = resp.get_data(as_text=True)

        self.assertEqual(resp.status_code, 200)
        self.assertIn('tester2', html)
        self.assertIn('<option ', html)

        new_user = User.query.filter_by(username='tester2').one()

        self.assertEqual(new_user.email, 'tester2@test.com')

    def test_login_view(self):

        form_data = {'email': 'test@test.com', 'password': 'tester1$A'}

        with self.client as c:
            resp = c.post('/login', data=form_data,
                          follow_redirects=True)

        html = resp.get_data(as_text=True)

        self.assertEqual(resp.status_code, 200)
        self.assertIn('tester1', html)
        self.assertIn('<option ', html)

    def test_logout_view(self):

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user.id

            resp = c.post('/logout', follow_redirects=True)

        html = resp.get_data(as_text=True)

        self.assertEqual(resp.status_code, 200)
        self.assertIn('tester1 logged out.', html)
        self.assertNotIn('<option ', html)

    def test_user_profile_logged_in(self):

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user.id

            resp = c.get(
                f'/user/profile/{self.user.username}', follow_redirects=True)

        html = resp.get_data(as_text=True)

        self.assertEqual(resp.status_code, 200)
        self.assertIn(self.user.username, html)
        self.assertIn('Edit Profile', html)

    def test_user_profile_logged_out(self):

        with self.client as c:
            resp = c.get(
                f'/user/profile/{self.user.username}', follow_redirects=True)

        html = resp.get_data(as_text=True)

        self.assertEqual(resp.status_code, 200)
        self.assertIn('Missions', html)
        self.assertIn('Mission Reports', html)
        self.assertNotIn('Edit Profile', html)

    def test_delete_view(self):

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user.id

            resp = c.post('/user/delete', follow_redirects=True)

        html = resp.get_data(as_text=True)
        u = User.query.get(self.user.id)

        self.assertEqual(resp.status_code, 200)
        self.assertIn('User Account Deleted', html)
        self.assertIsNone(u)
