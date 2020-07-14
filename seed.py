from models import (
    db, User, Prefrences, Mission, UserMission,
    Business, MissionBusiness, Report
)
from app import app  # noqa F401

# Create all tables
db.drop_all()
db.create_all()


user1 = User.register('test@test.com', 'tester1', 'tester1')
user2 = User.register('test2@test.com', 'tester2', 'tester2')
user3 = User.register('test3@test.com', 'tester3', 'tester3')

db.session.commit()


b1 = Business.create(name='Cuisine of Nepal', longitude=-122.42318,
                     latitude=37.74097, id='iUockw0CUssKZLyoGJYEXA')

m1 = Mission.create(editor=user1.id, name='Around the World in Eight Days',
                    city='San Francisco', state='California', country='USA')

db.session.commit()


m1.businesses.append(b1)

user1.missions.append(m1)

r1 = Report.create(user_id=user1.id, business_id='iUockw0CUssKZLyoGJYEXA',
                   text='Super mouth happy fun time!')

db.session.commit()
