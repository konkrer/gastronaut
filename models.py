from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

DEFAULT_PET_IMAGE = "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse1.mm.bing.net%2Fth%3Fid%3DOIP.MT9STn6tXEh8WpneZywb1AHaG7%26pid%3DApi&f=1"  # noqa E501


def connect_db(app):
    db.app = app
    db.init_app(app)


class User(db.Model):
    """User model"""

    __tablename__ = 'user_profiles'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    email = db.Column(db.String(60), unique=True, nullable=False)

    username = db.Column(db.String(50), unique=True,
                         nullable=False, index=True)

    password = db.Column(db.String, nullable=False)

    @classmethod
    def register(cls, email, username, password):
        """Create and return a new user instance with hashed password."""

        hashed = bcrypt.generate_password_hash(password)
        hashed_utf8 = hashed.decode("utf8")

        return cls(username=username, password=hashed_utf8, email=email)

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
        Return list of attributes for serialization, obj creation and editing.
        """
        return ['username', 'email']

    def serialize(self):
        # update model from database so serialization works by calling self.id
        id = self.id
        out = {k: v for k, v in self.__dict__.items() if k in self.set_get()}
        out['id'] = id
        return out


class Product(db.Model):
    """Product model"""

    __tablename__ = 'products'

    id = db.Column(db.Integer,
                   primary_key=True,
                   autoincrement=True)

    name = db.Column(db.String(50),
                     nullable=False,
                     unique=True,
                     index=True)

    category_code = db.Column(db.String(4), db.ForeignKey('categories.code'),
                              nullable=False)

    price = db.Column(db.Float,
                      nullable=False, index=True)

    photo_file = db.Column(db.String(255))

    category = db.relationship('Category', backref='products')

    team = db.relationship(
        'Employee', secondary='product_employee', backref="products")

    prod_employ = db.relationship(
        'ProductEmployee', backref="products", cascade="all, delete-orphan")

    __table_args__ = (
        db.Index('order_price_desc', price.desc(),
                 postgresql_using='btree', postgres_ops={'price': 'DESC'}),
        db.Index('name_like', 'name', postgres_ops={
                 'name': 'text_pattern_ops'}),
    )

    def __repr__(self):
        p = self
        return f"<product id={p.id} name={p.name} cat={p.category.name}>"

    def sale(self, prcnt):
        """Reduce price based on percent"""
        self.price *= 1 - prcnt/100
        self.price = max(self.price, 0)

    @classmethod
    def get_by_category(cls, category):
        """Return products by category"""
        cls.query.filter_by(category=category).all()

    @property
    def image_url(self):
        """Return photo_url if set else default image"""
        return self.photo_url or DEFAULT_PET_IMAGE

    @property
    def roles(self):
        """Return active roles, names, emails for project."""
        # With multiple querys
        # return [(pe.role, pe.employees.name, pe.employees.email, self.name)
        #         for pe in self.prod_employ]

        # With single query.
        return db.session.query(
            ProductEmployee.role, Employee.name, Employee.email, Product.name
        ).filter_by(product_id=self.id).join(Employee).join(Product).all()

    @classmethod
    def set_get(self):
        """
        Return list of attributes for serialization, obj creation and editing.
        """
        return ['name', 'category_code', 'price']

    def serialize(self):
        # update model from database so serialization works by calling self.id
        id = self.id
        out = {k: v for k, v in self.__dict__.items() if k in self.set_get()}
        out['id'] = id
        return out


class Category(db.Model):
    """Product categories"""

    __tablename__ = 'categories'

    code = db.Column(db.String(4), primary_key=True)

    name = db.Column(db.String(25), nullable=False, unique=True)

    details = db.Column(db.Text)


class Employee(db.Model):
    """Employee model"""

    __tablename__ = 'employees'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    name = db.Column(db.String(50), nullable=False)

    email = db.Column(db.String(55), unique=True, nullable=True)

    prod_employ = db.relationship(
        'ProductEmployee', backref='employees', cascade='all, delete-orphan')


class ProductEmployee(db.Model):
    """Product Employee join table model"""

    __tablename__ = 'product_employee'

    product_id = db.Column(db.Integer, db.ForeignKey(
        'products.id'), primary_key=True)

    employee_id = db.Column(db.Integer, db.ForeignKey(
        'employees.id'), primary_key=True)

    role = db.Column(db.String(30))
