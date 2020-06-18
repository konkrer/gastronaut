from models import (
    Product, Employee, Category, ProductEmployee, db
)
from app import app  # noqa F401

# Create all tables
db.drop_all()
db.create_all()


category = Category(code='shmo', name='Shoes mens outdoor',
                    details='mens hiking and trail shoes')
db.session.add(category)

emp = Employee(name='Bruce')
db.session.add(emp)
db.session.commit()

shoe = Product(name='best shoe', category_code='shmo', price=100.00)
db.session.add(shoe)
db.session.commit()

p_e = ProductEmployee(product_id=shoe.id, employee_id=emp.id, role='manager')
db.session.add(p_e)
db.session.commit()
