from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

DEFAULT_USER_IMAGE = "static/images/default_users_icon.jpg"
DEFAULT_PREFERENCES = {
    'Show Alcohol': True
}


def connect_db(app):
    db.app = app
    db.init_app(app)


class User(db.Model):
    """User model"""

    __tablename__ = 'user_profiles'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    email = db.Column(db.String(60), nullable=False, unique=True, index=True)

    username = db.Column(db.String(50), nullable=False, unique=True)

    password = db.Column(db.String, nullable=False)

    avatar_url = db.Column(db.String, nullable=True)

    city = db.Column(db.String, nullable=True)

    state = db.Column(db.String, nullable=True)

    is_admin = db.Column(db.Boolean, default=False, nullable=False)

    preferences = db.Column(db.PickleType, default=DEFAULT_PREFERENCES,
                            nullable=False)

    missions = db.relationship('Mission', secondary='users_missions',
                               backref='users')

    user_missions = db.relationship('UserMission', backref='user',
                                    cascade='all, delete-orphan')
    # missions user owns and can edit
    my_missions = db.relationship('Mission', backref='user')

    reports = db.relationship('Report', backref='user')

    @property
    def image_url(self):
        """Return photo_url if set else default image"""
        return self.avatar_url or DEFAULT_USER_IMAGE

    @classmethod
    def register(cls, email, username, password):
        """Create and return a new user instance with hashed password."""

        hashed_utf8 = bcrypt.generate_password_hash(password).decode("utf8")

        user = cls(email=email, username=username, password=hashed_utf8)
        db.session.add(user)

        return user

    def add_bookmarks(self):
        """Add a default bookmarks mission for user."""

        m = Mission.create(editor=self.id, name='Bookmarks')
        self.missions.append(m)
        db.session.commit()

    @classmethod
    def authenticate(cls, email, password):
        """Return a user instance if credentials are as expected."""

        u = cls.query.filter_by(email=email).first()
        if not u:
            # return None for no email match in database
            return None

        if bcrypt.check_password_hash(u.password, password):
            return u
        else:
            return False

    def __repr__(self):
        """User representation"""
        return f"<user id={self.id} name={self.username} >"

    @classmethod
    def set_get(self):
        """
        Return list of attributes for normal
        serialization, obj creation and editing.
        """
        return ['username', 'email', 'avatar_url', 'city', 'state']

    def serialize(self):
        """Serialize model set_get properties data to a dictonary."""
        # update model from database so serialization works by calling self.id
        id = self.id
        out = {k: v for k, v in self.__dict__.items() if k in self.set_get()}
        out['id'] = id
        return out


class Mission(db.Model):
    """Mission model"""

    __tablename__ = 'missions'

    id = db.Column(db.Integer,
                   primary_key=True,
                   autoincrement=True)

    editor = db.Column(db.Integer, db.ForeignKey(User.id))

    name = db.Column(db.String(50), nullable=False)

    is_public = db.Column(db.Boolean, default=False)

    date_shared = db.Column(db.DateTime, nullable=True)

    city = db.Column(db.String(55), index=True, nullable=True)

    state = db.Column(db.String(55), index=True, nullable=True)

    country = db.Column(db.String(55), nullable=True)

    likes = db.Column(db.Integer, nullable=False, default=1)

    user_missions = db.relationship('UserMission', backref='mission',
                                    cascade='all, delete-orphan')

    reports = db.relationship('Report', backref='mission')

    businesses = db.relationship('Business', secondary='missions_businesses',
                                 backref='missions')

    mission_businesses = db.relationship(
        'MissionBusiness', cascade='all, delete-orphan')

    __table_args__ = (
        db.Index('order_date_shared_desc', date_shared.desc(),
                 postgresql_using='btree',
                 postgres_ops={'date_shared': 'DESC'}),
        db.Index('name_like', 'name', postgres_ops={
                 'name': 'text_pattern_ops'}),
    )

    def __repr__(self):
        m = self
        return f"< mission id={m.id} name={m.name} >"

    @classmethod
    def get_by_city(cls, city):
        """Return misions by city"""
        cls.query.filter(cls.is_public is True,
                         cls.city.like(f'%{city}%')).all()

    @classmethod
    def get_by_state(cls, state):
        """Return misions by state"""
        cls.query.filter(cls.is_public is True,
                         cls.state.like(f'%{state}%')).all()

    @classmethod
    def get_by_recent(cls, state):
        """Return misions by state"""
        cls.query.filter(cls.is_public is True).order_by(
            cls.date_shared.desc()).all()

    @classmethod
    def set_get(self):
        """
        Return list of attributes for normal
        serialization, obj creation and editing.
        """
        return ['name', 'category_code', 'price']

    def serialize(self):
        """Serialize model set_get properties data to a dictonary."""
        # update model from database so serialization works by calling self.id
        id = self.id
        out = {k: v for k, v in self.__dict__.items() if k in self.set_get()}
        out['id'] = id
        return out

    @classmethod
    def create(cls, **kwargs):
        """Return a new instance of Mission that has been added to session."""
        try:
            m = cls(**kwargs)
        except Exception:
            return False

        db.session.add(m)
        return m


class UserMission(db.Model):
    """User-Mission Model."""

    __tablename__ = 'users_missions'

    user_id = db.Column(db.Integer, db.ForeignKey(User.id), primary_key=True)

    mission_id = db.Column(
        db.Integer, db.ForeignKey(Mission.id), primary_key=True)

    mission_completed = db.Column(db.Boolean, default=False)

    goals_completed = db.Column(db.PickleType, default=[])

    @classmethod
    def get_user_mission(cls, user_id, mission_id):
        """Return UserMission with given user_id/mission id."""

        u_m = cls.query.filter_by(
            user_id=user_id, mission_id=mission_id).first()

        return u_m

    @classmethod
    def create(cls, **kwargs):
        """
        Return a new instance of UserMission
        that has been added to session.
        """
        try:
            u_m = cls(**kwargs)

        except Exception:
            return False

        db.session.add(u_m)
        return u_m


class Business(db.Model):
    """Business Model for Yelp businesses"""

    __tablename__ = 'businesses'

    id = db.Column(db.String, primary_key=True)

    longitude = db.Column(db.Float, nullable=False)

    latitude = db.Column(db.Float, nullable=False)

    name = db.Column(db.String(), nullable=False)

    reports = db.relationship('Report', backref='business')

    missions_businesses = db.relationship('MissionBusiness',
                                          cascade='all, delete-orphan')

    @classmethod
    def create(cls, **kwargs):
        """Return a new instance of Business that has been added to session."""
        try:
            b = cls(**kwargs)
        except Exception:
            return False

        db.session.add(b)
        return b


class Report(db.Model):
    """Mission Report Model."""

    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    user_id = db.Column(db.Integer, db.ForeignKey(User.id))

    mission_id = db.Column(
        db.Integer, db.ForeignKey(Mission.id), nullable=True)

    business_id = db.Column(
        db.String, db.ForeignKey(Business.id), nullable=True)

    text = db.Column(db.Text, nullable=False)

    @classmethod
    def create(cls, **kwargs):
        """Return a new instance of Report that has been added to session."""
        try:
            r = cls(**kwargs)
        except Exception:
            return False

        db.session.add(r)
        return r


class MissionBusiness(db.Model):
    """Missions Businesses join table."""

    __tablename__ = 'missions_businesses'

    mission_id = db.Column(
        db.Integer, db.ForeignKey(Mission.id), primary_key=True)

    business_id = db.Column(
        db.String, db.ForeignKey(Business.id), primary_key=True)

    @classmethod
    def create(cls, **kwargs):
        """
        Return a new instance of MissionBusiness
        that has been added to session.
        """
        try:
            m_b = cls(**kwargs)
        except Exception:
            return False

        db.session.add(m_b)
        return m_b


# @property
    # def roles(self):
    #     """Return active roles, names, emails for project."""
    #     # With multiple querys
    #     # return [(pe.role, pe.employees.name, pe.employees.email, self.name)
    #     #         for pe in self.prod_employ]

    #     # With single query.
    #     return db.session.query(
    #         ProductEmployee.role, Employee.name, Employee.email, Product.name
    #     ).filter_by(product_id=self.id).join(Employee).join(Product).all()
