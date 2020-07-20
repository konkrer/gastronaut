"""Tests for Gastronaut models."""

from unittest import TestCase
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
        """Clean up any existing Products."""

        self.user = User.register(email="test@test.com",
                                  username="tester1", password="tester1")

        self.mission = Mission.create(
            editor=self.user.id, name="test mission", city="Albany",
            state="New York", country='USA')
        self.mission.share()

        self.mission2 = Mission.create(
            editor=self.user.id, name="test mission 2", city="Ithica",
            state="New York", country='Outer Space')
        self.mission2.share()

        db.session.commit()

    def tearDown(self):

        db.session.rollback()
        UserMission.query.delete()
        Mission.query.delete()
        User.query.delete()

    def test_get_by_city(self):
        albany = Mission.get_by_city('Albany')

        self.assertEqual(albany[0].city, 'Albany')
        self.assertListEqual(albany, [self.mission])

    def test_get_by_state(self):
        ny_missions = Mission.get_by_state('New York')

        self.assertListEqual(ny_missions, [self.mission, self.mission2])

    def test_get_by_country(self):
        usa = Mission.get_by_country('USA')

        self.assertListEqual(usa, [self.mission])

    def test_get_by_recent(self):

        mission3 = Mission.create(
            editor=self.user.id, name="test mission 3", city="LA",
            state="CA", country='USA')
        mission3.share()
        db.session.commit()

        recent = Mission.get_by_recent()

        self.assertEqual(len(recent), 3)
        self.assertEqual(recent[0], mission3)

    def test_serialize(self):
        mission_serial = self.mission.serialize()

        expected_output = {
            'likes': 1, 'state': 'New York', 'city': 'Albany',
            'editor': self.user.id, 'country': 'USA',
            'name': 'test mission', 'id': self.mission.id}

        self.assertEqual(mission_serial, expected_output)

    def test_repr(self):
        m = self.mission
        self.assertEqual(
            repr(self.mission),
            f"<Mission id={m.id} name={m.name} editor={m.editor} >"
        )


class ModelsRelationshipsTestCase(TestCase):
    """Tests to ensure relationships expressed
       as model properties work as expected.
    """

    def setUp(self):

        self.user = User.register(email="test@test.com",
                                  username="tester1", password="tester1")

        self.mission = Mission.create(
            editor=self.user.id, name="test mission", city="Albany",
            state="New York", country='USA')
        self.mission.share()

        self.mission2 = Mission.create(
            editor=self.user.id, name="test mission 2", city="Ithica",
            state="New York", country='Outer Space')
        self.mission2.share()

        self.business = Business.create(
            name="Cusine of Nepal", id='82372347',
            longitude=20.22, latitude=77.0)

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

        self.assertEqual(self.user.preferences['Show Alcohol'], True)
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
