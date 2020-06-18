from unittest import TestCase

from app import app
from models import db, Product, Category

# Use test database and don't clutter tests with SQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///database_name_test'
app.config['SQLALCHEMY_ECHO'] = False

# Make Flask errors be real errors, rather than HTML pages with error info
app.config['TESTING'] = True

# This is a bit of hack, but don't use Flask DebugToolbar
app.config['DEBUG_TB_HOSTS'] = ['dont-show-debug-toolbar']

# Disable CRSF for tests
app.config['WTF_CSRF_ENABLED'] = False

db.drop_all()
db.create_all()


class ProductViewsTestCase(TestCase):
    """Tests for views for Product."""

    def setUp(self):
        """Add sample pet."""

        cat = Category(name="Books", code='book')
        db.session.add(cat)
        db.session.commit()

        book = Product(name="1984", category_code="book", price=10)
        db.session.add(book)
        db.session.commit()

        self.cat_code = cat.code
        self.book_id = book.id

    def tearDown(self):
        """Clean up any fouled transaction."""

        db.session.rollback()
        Product.query.delete()
        Category.query.delete()

    def test_list_product(self):
        with app.test_client() as client:
            # view does not exist as tested
            resp = client.get("/")
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn('1984', html)

    def test_show_product(self):
        with app.test_client() as client:
            # view does not exist
            resp = client.get(f"/{self.book_id}")
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn('<h1>1984</h1>', html)

    def test_add_product(self):
        with app.test_client() as client:
            d = {"name": "1984", "category_code": "book", "price": 10}
            # view does not exist
            resp = client.post("/", data=d, follow_redirects=True)
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn("<h1>1984</h1>", html)


class ApiTestCase(TestCase):
    """Api endpoint tests"""

    def setUp(self):

        cat = Category(name="Books", code='book')
        db.session.add(cat)
        db.session.commit()

        book = Product(name="1984", category_code="book", price=10)
        db.session.add(book)
        db.session.commit()

        self.cat_code = cat.code
        self.prod_id = book.id
        self.client = app.test_client()

    def tearDown(self):
        db.session.rollback()
        Product.query.delete()
        Category.query.delete()

    def test_list_products_api(self):
        with self.client as client:
            res = client.get("/api/products")
            self.assertEqual(res.status_code, 200)

            self.assertEqual(
                {
                    "products": [
                        {
                            "category_code": "book",
                            "id": self.prod_id,
                            "name": "1984",
                            "price": 10
                        }
                    ]
                },
                res.json)

    def test_add_product_api(self):
        with self.client as client:
            json = {"name": "Animal Farm",
                    "category_code": "book", "price": 15}
            res = client.post('/api/products', json=json)
            self.assertEqual(res.status_code, 201)

            self.assertIsInstance(res.json['product']['id'], int)
            del res.json['product']['id']

            self.assertEqual(
                {
                    "product": {
                        "category_code": "book",
                        "name": "Animal Farm",
                        "price": 15
                    }
                },
                res.json)

            self.assertEqual(Product.query.count(), 2)

    def test_detail_product_api(self):
        with self.client as client:
            res = client.get(f'/api/products/{self.prod_id}')
            self.assertEqual(res.status_code, 200)

            self.assertEqual(
                {
                    "product": {
                        "category_code": "book",
                        "id": self.prod_id,
                        "name": "1984",
                        "price": 10
                    }
                },
                res.json)
