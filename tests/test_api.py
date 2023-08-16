"""Tests for Gastronaut models."""

from types import SimpleNamespace
from unittest import TestCase
from app import app, H
from models import (db, User, Mission, Business, MissionBusiness,
                    Report, UserMission)


# Use test database and don't clutter tests console output with SQL
app.config['SQLALCHEMY_DATABASE_URI'] = \
    'postgresql://postgres:postgres@localhost:5432/gastronaut_test'
app.config['SQLALCHEMY_ECHO'] = False

# Make Flask errors be real errors, rather than HTML pages with error info
app.config['TESTING'] = False

# This is a bit of hack, but don't use Flask DebugToolbar
app.config['DEBUG_TB_HOSTS'] = ['dont-show-debug-toolbar']


with app.app_context():
    db.drop_all()
    db.create_all()

# py -m unittest tests/test_api.py


class APIViewTests(TestCase):

    def setUp(self):
        self.client = app.test_client()

    def tearDown(self):
        db.session.rollback()
        Report.query.delete()
        Business.query.delete()
        UserMission.query.delete()
        Mission.query.delete()
        User.query.delete()

    def test_search_yelp(self):
        """Test reaching the Yelp API for businesses search data."""

        resp = self.client.get('/v1/search?location=sf&category=restaurants')
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertIn('businesses', data)

    def test_yelp_business_detail(self):
        """Test reaching the Yelp API for business detail data."""

        resp = self.client.get(
            '/v1/business_detail/Kx1WExNj5ogaFe0cyg9L6A?name=Little+Nepal&latlng=37.7391,-122.41361'  # noqa e501
        )
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertIn('name', data)
        self.assertEqual(data['name'], 'Little Nepal')

    def test_reports_yelp_business_detail(self):
        """Test that calling business detail on a business that has reports
           written about it includes details about that business.

           # TODO: MOCK out actual yelp API call."""

        u1 = User.register(email='test@test.com',
                           username='tester1', password='tester1')
        Business.create(
            name='Cuisine of Nepal', longitude=-122.42318,
            latitude=37.74097, id='iUockw0CUssKZLyoGJYEXA',
            city='San Francisco', state='CA', country='US')

        db.session.commit()

        Report.create(user_id=u1.id, text='Good fud.',
                      business_id='iUockw0CUssKZLyoGJYEXA')

        db.session.commit()

        with self.client as c:
            resp = c.get(
                '/v1/business_detail/iUockw0CUssKZLyoGJYEXA?name=Cuisine+of+Nepal&latlng=37.74097,-122.42318')  # noqa e501
            data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertIn('reports', data)
        self.assertEqual(data['reports'][0]['text'], 'Good fud.')

    def test_get_coords_from_IP_address(self):
        """Test reaching the IPWhois API for data."""

        fake_request = SimpleNamespace(
            environ={'HTTP_X_FORWARDED_FOR': '34.221.74.60'}, remote_addr=1
        )

        lat, lng = H.get_coords_from_IP_address(fake_request)

        float(lat)
        float(lng)

    def test_set_preferences(self):
        """Test set preferences endpoint."""

        u1 = User.register(email='test@test.com',
                           username='tester1', password='tester1')

        with app.test_client() as c:
            with c.session_transaction() as sess:
                sess['user_id'] = u1.id
            c.post('/v1/preferences',
                   json={'Boolean': True, 'show_alcohol': False})

        u1 = User.query.get(u1.id)

        self.assertFalse(u1.preferences.show_alcohol)


class ReportApiTestCase(TestCase):

    def setUp(self):

        self.user = User.register(
            email='test@test.com',
            username='tester1', password='tester1')

        self.user2 = User.register(
            email='test2@test.com',
            username='tester2', password='tester2')

        self.business = Business.create(
            name='Cuisine of Nepal', longitude=-122.42318, latitude=37.74097,
            id='iUockw0CUssKZLyoGJYEXA', city='San Francisco',
            state='CA', country='US')

        self.report = Report.create(
            user_id=self.user.id, business_id='iUockw0CUssKZLyoGJYEXA',
            text='Best dern nipplease fud i eva had!')

        db.session.commit()

        self.client = app.test_client()

    def tearDown(self):
        db.session.rollback()
        Report.query.delete()
        Business.query.delete()
        UserMission.query.delete()
        Mission.query.delete()
        User.query.delete()

    def test_like_report(self):
        """Test like report endpoint."""

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user2.id

            db.session.add(self.report)
            resp = c.post(f'/v1/report/like/{self.report.id}')

        self.assertEqual(resp.json['success'], 'added')
        report = Report.query.get(self.report.id)
        self.assertEqual(report.likes, {0, self.user2.id})

    def test_unlike_report(self):
        """Test un-like report endpoint."""

        self.report.likes = {0, self.user2.id}
        db.session.commit()
        report = Report.query.get(self.report.id)
        # make sure like is there in report.likes.
        self.assertEqual(report.likes, {0, self.user2.id})

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user2.id

            resp = c.post(f'/v1/report/like/{self.report.id}')

        self.assertEqual(resp.json['success'], 'removed')
        report = Report.query.get(self.report.id)
        self.assertEqual(report.likes, {0})


class MissionApiTestCase(TestCase):

    @ classmethod
    def setUpClass(cls):
        cls.business_data = {
            'id': '3h939hd798dhjf97', 'name': 'Awesome Fud Place',
            'city': 'San Francisco', 'state': 'ca', 'country': 'us',
            'longitude': 122.39098, 'latitude': 38.73290}

    def setUp(self):

        self.user = User.register(
            email='test@test.com',
            username='tester1', password='tester1')

        self.user2 = User.register(
            email='test2@test.com',
            username='tester2', password='tester2')

        self.mission = Mission.create(
            editor=self.user.id, name='Food Truck Grand Tour',
            city='San Francisco', state='CA', country='US',
            description="The pletora of SF food trucks never ceases to amaze.")

        db.session.commit()

        self.client = app.test_client()

    def tearDown(self):
        db.session.rollback()
        MissionBusiness.query.delete()
        Business.query.delete()
        UserMission.query.delete()
        Mission.query.delete()
        User.query.delete()

    def test_like_mission(self):
        """Test like mission endpoint."""

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user2.id

            db.session.add(self.mission)
            resp = c.post(f'/v1/mission/like/{self.mission.id}')

        self.assertEqual(resp.json['success'], 'added')
        mission = Mission.query.get(self.mission.id)
        self.assertEqual(mission.likes, {0, self.user2.id})

    def test_unlike_mission(self):
        """Test un-like mission endpoint."""

        self.mission.likes = {0, self.user2.id}
        db.session.commit()
        mission = Mission.query.get(self.mission.id)
        # make sure like is there in mission.likes.
        self.assertEqual(mission.likes, {0, self.user2.id})

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user2.id

            resp = c.post(f'/v1/mission/like/{self.mission.id}')

        self.assertEqual(resp.json['success'], 'removed')
        mission = Mission.query.get(self.mission.id)
        self.assertEqual(mission.likes, {0})

    def test_add_mission(self):
        """Test adding user mission endpoint."""

        self.assertNotIn(self.mission, self.user2.missions)

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user2.id

            db.session.add(self.mission)

            # test adding mission
            resp = c.post(f'/v1/mission/add/{self.mission.id}')

            self.assertEqual(resp.json['success'], 'Mission Added!')
            user2 = User.query.get(self.user2.id)
            self.assertIn(self.mission, user2.missions)

            # test repeat adding does nothing
            resp = c.post(f'/v1/mission/add/{self.mission.id}')

            self.assertEqual(resp.json['success'], 'Mission Already Added.')
            user2 = User.query.get(self.user2.id)
            mission = Mission.query.get(self.mission.id)
            self.assertIn(mission, user2.missions)
            self.assertEqual(user2.missions.count(mission), 1)

    def test_remove_mission(self):
        """Test removing user mission endpoint."""

        self.user2.missions.append(self.mission)
        db.session.commit()

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user2.id

            db.session.add(self.mission)

            # test adding mission
            resp = c.post(f'/v1/mission/remove/{self.mission.id}')

            self.assertEqual(resp.json['success'], 'Mission Removed!')
            user2 = User.query.get(self.user2.id)
            self.assertNotIn(self.mission, user2.missions)

            # test repeat removing does nothing
            resp = c.post(f'/v1/mission/remove/{self.mission.id}')

            self.assertEqual(resp.json['success'], 'Mission Already Removed.')
            user2 = User.query.get(self.user2.id)
            mission = Mission.query.get(self.mission.id)
            self.assertNotIn(mission, user2.missions)
            self.assertEqual(user2.missions.count(mission), 0)

    def test_add_business_to_mission(self):
        """Test adding business to mission endpoint."""

        self.assertEqual(len(self.mission.businesses), 0)

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user2.id

            db.session.add(self.mission)

            resp = c.post(
                f'v1/mission/add_business/{self.mission.id}',
                json=self.business_data)

            self.assertEqual(resp.json['success'],
                             'Added!')
            business = Business.query.get('3h939hd798dhjf97')
            self.assertIn(business, self.mission.businesses)
            self.assertEqual(len(self.mission.businesses), 1)

            # test repeat adding does nothing
            resp = c.post(
                f'v1/mission/add_business/{self.mission.id}',
                json=self.business_data)

            self.assertEqual(resp.json['success'], 'Already Added.')
            self.assertIn(business, self.mission.businesses)
            self.assertEqual(len(self.mission.businesses), 1)

    def test_remove_business_from_mission(self):
        """Test removing business from mission endpoint."""

        business = Business.create(**self.business_data)
        self.mission.businesses.append(business)
        db.session.commit()

        with self.client as c:
            with c.session_transaction() as sess:
                sess['user_id'] = self.user2.id

            db.session.add(self.mission)  # ????

            data = {'business_id': self.business_data['id']}

            # test removing mission
            resp = c.post(f'/v1/mission/remove_business/{self.mission.id}',
                          json=data)

            self.assertEqual(resp.json['success'],
                             'Business Removed from Mission!')
            self.assertNotIn(business, self.mission.businesses)

            # test repeat removing does nothing
            resp = c.post(f'/v1/mission/remove_business/{self.mission.id}',
                          json=data)

            self.assertEqual(resp.json['success'], 'Business not in mission.')
            self.assertNotIn(business, self.mission.businesses)
