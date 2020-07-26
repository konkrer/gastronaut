"""Tests for Gastronaut views that alter models."""

from unittest import TestCase
from datetime import datetime
from app import app
from models import (db, User, DEFAULT_USER_IMAGE, Mission, Business,
                    Report, UserMission, MissionBusiness)


# Use test database and don't clutter tests with SQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///gastronaut_test'
app.config['SQLALCHEMY_ECHO'] = False

db.drop_all()
db.create_all()

# py -m unittest tests/test_sql_models.py


class UserModelTestCase(TestCase):
    """User model tests."""

    def setUp(self):

        self.user = User.register(email="test@test.com",
                                  username="tester1", password="tester1")

    def tearDown(self):

        db.session.rollback()
        UserMission.query.delete()
        Mission.query.delete()
        User.query.delete()

    def test_register(self):
        self.assertEqual(self.user.email, 'test@test.com')
        self.assertEqual(self.user.username, 'tester1')
        self.assertNotEqual(self.user.password, 'tester1')
        self.assertEqual(len(self.user.missions), 1)
        self.assertEqual(self.user.my_missions[0].name, 'Bookmarks')

    def test_authenticate(self):
        u = User.authenticate(email='test@test.com', password='tester1')

        self.assertIsInstance(u, User)
        self.assertEqual(self.user, u)

    def test_image_url(self):
        self.assertEqual(self.user.get_avatar, DEFAULT_USER_IMAGE)

    def test_serialize(self):
        user_serialized = self.user.serialize()

        expected_output = {
            'email': 'test@test.com', 'state': '', 'avatar_url': None,
            'username': 'tester1', 'city': '', 'id': self.user.id}

        self.assertEqual(user_serialized, expected_output)

    def test_repr(self):
        self.assertEqual(
            repr(self.user), f"<User id={self.user.id} username=tester1 >")


class MissionModelTestCase(TestCase):
    """Mission model tests."""

    def setUp(self):

        self.user = User.register(email="test@test.com",
                                  username="tester1", password="tester1")

        self.mission = Mission.create(
            editor=self.user.id, name="test mission", city="Albany",
            state="NY", country='US')
        self.mission.share()

        self.mission2 = Mission.create(
            editor=self.user.id, name="test mission 2", city="Ithica",
            state="NY", country='US')
        self.mission2.share()

        self.business = Business.create(
            name='Cuisine of Nepal', longitude=-122.42318,
            latitude=37.74097, id='iUockw0CUssKZLyoGJYEXA',
            city='San Francisco', state='CA', country='US')

        self.business2 = Business.create(
            name='Little Nepal', longitude=-122.41361,
            latitude=37.7391, id='Kx1WExNj5ogaFe0cyg9L6A',
            city='San Francisco', state='CA', country='US')

        self.mission.businesses.append(self.business)
        self.mission2.businesses.append(self.business2)

        db.session.commit()

    def tearDown(self):

        db.session.rollback()
        MissionBusiness.query.delete()
        Business.query.delete()
        UserMission.query.delete()
        Mission.query.delete()
        User.query.delete()

    def test_get_by_recent(self):

        mission3 = Mission.create(
            editor=self.user.id, name="test mission 3", city="LA",
            state="CA", country='US')
        mission3.share()
        db.session.commit()

        recent = Mission.get_by_recent()

        self.assertEqual(len(recent), 3)
        self.assertEqual(recent[0], mission3)

    def test_get_by_recent_miss_not_shared(self):

        Mission.create(
            editor=self.user.id, name="test mission 3", city="LA",
            state="CA", country='US')
        db.session.commit()

        recent = Mission.get_by_recent()

        self.assertEqual(len(recent), 2)

    def test_search_hit(self):

        hit = Mission.search(
            {'city': 'ithica', 'state': 'ny', 'keywords': 'little',
             'country': 'us', 'sort_by': 'recent'})

        self.assertListEqual([self.mission2], hit)

    def test_search_miss(self):
        miss = Mission.search(
            {'city': 'ithica', 'state': 'ny', 'keywords': 'potato',
             'country': 'us', 'sort_by': 'recent'})

        self.assertListEqual([], miss)

    def test_search_miss_not_shared(self):

        m3 = Mission.create(
            editor=self.user.id, name='I like cheese.',
            city='San Francisco', state='CA', country='US',
            description="What is there to explain. Let's get some cheese.")

        m3.businesses.append(self.business)
        db.session.commit()

        miss = Mission.search(
            {'city': '', 'state': '', 'keywords': '',
             'country': '', 'sort_by': 'recent'})

        self.assertEqual(len(miss), 2)

    def test_serialize(self):
        mission_serial = self.mission.serialize()

        expected_output = {
            'likes': 1, 'state': 'NY', 'city': 'Albany',
            'editor': self.user.id, 'country': 'US',
            'name': 'test mission', 'id': self.mission.id,
            'description': None, 'is_public': True}

        self.assertEqual(mission_serial, expected_output)

    def test_repr(self):
        m = self.mission
        self.assertEqual(
            repr(self.mission),
            f"<Mission id={m.id} name={m.name} editor={m.editor} >"
        )


class ReportModelTestCase(TestCase):

    def setUp(self):

        self.user = User.register(email="test@test.com",
                                  username="tester1", password="tester1")

        self.mission = Mission.create(
            editor=self.user.id, name="test mission", city="Albany",
            state="NY", country='US')

        self.business = Business.create(
            name='Cuisine of Nepal', longitude=-122.42318,
            latitude=37.74097, id='iUockw0CUssKZLyoGJYEXA',
            city='San Francisco', state='CA', country='US')

        self.mission.businesses.append(self.business)

        self.report = Report.create(
            user_id=self.user.id, business_id='iUockw0CUssKZLyoGJYEXA',
            text='Best dern nipplease fud i eva had!')

        db.session.commit()

        self.report2 = Report.create(
            user_id=self.user.id, mission_id=self.mission.id,
            text='The curry was devine!')

        db.session.commit()

    def tearDown(self):

        db.session.rollback()
        Report.query.delete()
        MissionBusiness.query.delete()
        Business.query.delete()
        UserMission.query.delete()
        Mission.query.delete()
        User.query.delete()

    def test_get_by_recent(self):

        report3 = Report.create(
            user_id=self.user.id, business_id='iUockw0CUssKZLyoGJYEXA',
            text='The curry was devine!')

        db.session.commit()
        report3.submitted_on = datetime.utcnow()
        db.session.commit()

        recent = Report.get_by_recent()

        self.assertEqual(len(recent), 3)
        self.assertEqual(recent[0], report3)

    def test_search_hit(self):

        hit = Report.search({
            'city': 'san francisco', 'state': 'ca',
            'keywords': 'fud', 'country': 'us', 'sort_by': 'recent'})

        self.assertListEqual([self.report], hit)

        hit_2 = Report.search({
            'city': 'albany', 'state': 'ny', 'keywords': '',
            'country': 'us', 'sort_by': 'recent'})

        self.assertListEqual([self.report2], hit_2)

    def test_search_miss(self):
        miss = Report.search(
            {'city': 'albany', 'state': 'ny', 'keywords': 'potato',
             'country': 'us', 'sort_by': 'recent'})

        self.assertListEqual([], miss)


class ModelsRelationshipsTestCase(TestCase):
    """Tests to ensure relationships expressed
       as model properties work as expected.
    """

    def setUp(self):

        self.user = User.register(email="test@test.com",
                                  username="tester1", password="tester1")

        self.mission = Mission.create(
            editor=self.user.id, name="test mission", city="Albany",
            state="NY", country='US')
        self.mission.share()

        self.mission2 = Mission.create(
            editor=self.user.id, name="test mission 2", city="Ithica",
            state="NY", country='US')
        self.mission2.share()

        self.business = Business.create(
            name="Cusine of Nepal", id='82372347', city='San Francisco',
            state='CA', country='US', longitude=20.22, latitude=77.0)

        db.session.commit()

        self.report = Report.create(
            user_id=self.user.id, business_id=self.business.id,
            text="Amazing!")

        self.report = Report.create(
            user_id=self.user.id, mission_id=self.mission.id,
            text="Amazing Mission!")

        db.session.commit()

    def tearDown(self):
        db.session.rollback()

        UserMission.query.delete()
        MissionBusiness.query.delete()
        Report.query.delete()
        Mission.query.delete()
        Business.query.delete()
        User.query.delete()

    def test_user_relationships(self):

        self.assertEqual(self.user.preferences.show_alcohol, True)
        self.assertEqual(len(self.user.missions), 1)
        self.assertEqual(len(self.user.user_missions), 1)
        self.assertEqual(len(self.user.my_missions), 3)
        self.assertEqual(len(self.user.reports), 2)

        self.user.missions.extend([self.mission, self.mission2])
        db.session.commit()

        self.assertEqual(len(self.user.missions), 3)
        self.assertEqual(len(self.user.user_missions), 3)
        self.assertEqual(len(self.user.my_missions), 3)

    def test_mission_relationships(self):

        self.assertEqual(len(self.mission.user_missions),  0)
        self.assertEqual(len(self.mission.businesses), 0)
        self.assertEqual(len(self.mission.mission_businesses), 0)
        self.assertEqual(len(self.mission.reports), 1)
        self.assertEqual(self.mission.user, self.user)

        self.user.missions.append(self.mission)
        self.mission.businesses.append(self.business)
        db.session.commit()

        db.session.commit()

        self.assertEqual(len(self.mission.user_missions), 1)
        self.assertEqual(len(self.mission.businesses), 1)
        self.assertEqual(len(self.mission.mission_businesses), 1)

    def test_business_relationships(self):

        self.assertEqual(len(self.business.reports),  1)
        self.assertEqual(len(self.mission.businesses), 0)

        self.mission.businesses.append(self.business)
        db.session.commit()

        self.assertEqual(len(self.mission.businesses), 1)
