from unittest import TestCase

from flask_app_template import app
from flask_model_template import db, Product


# Use test database and don't clutter tests with SQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///sqla_intro_test'
app.config['SQLALCHEMY_ECHO'] = False

db.drop_all()
db.create_all()


class ProductModelTestCase(TestCase):
    """Tests for model for Pets."""

    def setUp(self):
        """Clean up any existing Products."""

        Product.query.delete()

    def tearDown(self):
        """Clean up any fouled transaction."""

        db.session.rollback()

    def test_repr(self):
        book = Product(name="1984", category="book", price=10)
        self.assertEquals(
            repr(book), "<product id= name=1984 category=book>")

    def test_sale(self):
        book = Product(name="1984", category="book", price=10)
        book.sale(10)
        self.assertEquals(book.price, 9)

        book.sale(999)
        self.assertEquals(Product.price, 0)

    def test_get_by_species(self):
        book = Product(name="1984", category="book", price=10)
        db.session.add(book)
        db.session.commit()

        books = Product.get_by_category('book')
        self.assertEquals(books, [book])
