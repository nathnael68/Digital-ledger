import uuid
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.customer import Customer
from backend.app.models.product import Product
from backend.app.models.sale import Sale
from backend.app.models.sale_item import SaleItem
from backend.app.models.payment import Payment
from backend.app.models.audit_log import AuditLog


def test_user_creation(db_session: Session):
    user = User(
        username="abebe_tesfaye",
        full_name="Abebe Tesfaye",
        password_hash="mock_hash_argon2id",
        role="sales_employee",
    )
    db_session.add(user)
    db_session.flush()

    assert user.id is not None
    assert isinstance(user.id, uuid.UUID)
    assert user.role == "sales_employee"
    assert user.is_active is True
    assert user.created_at is not None


def test_customer_creation(db_session: Session):
    customer = Customer(
        name="Addis Printing Enterprise",
        phone="+251911223344",
        address="Bole Sub-City, Addis Ababa",
    )
    db_session.add(customer)
    db_session.flush()

    assert customer.id is not None
    assert customer.name == "Addis Printing Enterprise"
    assert customer.phone == "+251911223344"


def test_product_creation(db_session: Session):
    product = Product(
        name="A4 Printing Paper 80gsm",
        description="High brightness multipurpose paper, 500 sheets/ream",
        default_price=Decimal("450.00"),
        unit="ream",
    )
    db_session.add(product)
    db_session.flush()

    assert product.id is not None
    assert product.default_price == Decimal("450.00")
    assert product.unit == "ream"
    assert product.is_active is True


def test_sale_with_items_and_payment_atomic(db_session: Session):
    # 1. Create User
    employee = User(
        username="almaz_k",
        full_name="Almaz Kebede",
        password_hash="hashed_secret",
        role="sales_employee",
    )
    db_session.add(employee)
    db_session.flush()

    # 2. Create Customer
    customer = Customer(
        name="Sheger Graphics PLC",
        phone="+251912345678",
    )
    db_session.add(customer)
    db_session.flush()

    # 3. Create Product
    product = Product(
        name="Cyan Offset Ink 1kg",
        default_price=Decimal("1200.00"),
        unit="can",
    )
    db_session.add(product)
    db_session.flush()

    # 4. Create Sale
    now = datetime.now(timezone.utc)
    sale = Sale(
        sale_number="DLG-202611-0001",
        customer_id=customer.id,
        sale_date=now,
        subtotal=Decimal("2400.00"),
        discount=Decimal("100.00"),
        grand_total=Decimal("2300.00"),
        paper_receipt_number="REC-89021",
        payment_status="partial",
        created_by=employee.id,
    )
    db_session.add(sale)
    db_session.flush()

    # 5. Create Sale Item with snapshot
    item = SaleItem(
        sale_id=sale.id,
        product_id=product.id,
        description_snapshot="Cyan Offset Ink 1kg (Delgone Premium)",
        quantity=Decimal("2.000"),
        unit_price=Decimal("1200.00"),
        line_subtotal=Decimal("2400.00"),
    )
    db_session.add(item)

    # 6. Create Initial Payment (Split: Cash 1000 ETB)
    payment = Payment(
        sale_id=sale.id,
        amount=Decimal("1000.00"),
        payment_method="cash",
        payment_date=now,
        recorded_by=employee.id,
    )
    db_session.add(payment)

    # 7. Create Audit Log
    audit = AuditLog(
        user_id=employee.id,
        action="CREATE",
        entity_type="Sale",
        entity_id=str(sale.id),
        new_value={"sale_number": sale.sale_number, "grand_total": "2300.00"},
        reason="Initial counter sale entry",
    )
    db_session.add(audit)
    db_session.flush()

    # Verify relationships and snapshots
    assert len(sale.items) == 1
    assert sale.items[0].description_snapshot == "Cyan Offset Ink 1kg (Delgone Premium)"
    assert sale.items[0].line_subtotal == Decimal("2400.00")
    assert len(sale.payments) == 1
    assert sale.payments[0].amount == Decimal("1000.00")
    assert sale.creator.username == "almaz_k"
    assert sale.customer.name == "Sheger Graphics PLC"

    # Verify outstanding balance logic
    outstanding_balance = sale.grand_total - sum(p.amount for p in sale.payments)
    assert outstanding_balance == Decimal("1300.00")
