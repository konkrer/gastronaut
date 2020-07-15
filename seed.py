from models import (
    db, User, Mission, Business, Report
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
b2 = Business.create(name='Little Nepal', longitude=-122.41361,
                     latitude=37.7391, id='Kx1WExNj5ogaFe0cyg9L6A')
b3 = Business.create(name='Mission Curry House', longitude=-122.41928,
                     latitude=37.75796, id='uj2GUGSIRlrLDr5iQKvUfQ')

m1 = Mission.create(editor=user1.id, name='Around the World in Eight Days',
                    city='San Francisco', state='California', country='USA')
m2 = Mission.create(editor=user1.id, name='Food Truck Grand Tour',
                    city='San Francisco', state='California', country='USA')
m3 = Mission.create(editor=user1.id, name='I like cheese.',
                    city='San Francisco', state='California', country='USA')

db.session.commit()


m1.businesses.extend([b1, b2, b3])

m2.businesses.extend([b2, b3])

m3.businesses.extend([b1, b3])

user1.missions.extend([m1, m2, m3])
user2.missions.extend([m1])
user3.missions.extend([m2, m3])

r1 = Report.create(user_id=user1.id, business_id='iUockw0CUssKZLyoGJYEXA',
                   text='Super mouth happy fun time!')
r2 = Report.create(user_id=user2.id, business_id='iUockw0CUssKZLyoGJYEXA',
                   text='Best dern nipplease fud i eva had!')
r3 = Report.create(user_id=user3.id, business_id='iUockw0CUssKZLyoGJYEXA',
                   text='The chicken curry was devine!')

db.session.commit()
