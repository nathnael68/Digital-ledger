from datetime import datetime, timezone
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.app.core.security import hash_password
from backend.app.models.customer import Customer
from backend.app.models.payment import Payment
from backend.app.models.sale import Sale
from backend.app.models.user import User


def test_dashboard_empty_database(client: TestClient, db_session: Session):
    user = User(
        username="dash_user",
        full_name="Dashboard User",
        password_hash=hash_password("Password123!"),
        role="sales_employee",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    client.post(
        "/api/auth/login",
        json={"username": "dash_user", "password": "Password123!"},
    )

    resp = client.get("/api/dashboard")
    assert resp.status_code == 200
    data = resp.json()

    assert data["summary"]["today_sales"] == "0.00"
    assert data["summary"]["cash_received"] == "0.00"
    assert data["summary"]["bank_received"] == "0.00"
    assert data["summary"]["credit_sales"] == "0.00"
    assert data["summary"]["outstanding_balance"] == "0.00"
    assert data["summary"]["total_transactions"] == 0
    assert len(data["trend_7_days"]) == 7
    assert len(data["recent_transactions"]) == 0


def test_dashboard_calculations_with_real_records(client: TestClient, db_session: Session):
    # 1. Create User
    cashier = User(
        username="cashier_abebe",
        full_name="Abebe Cashier",
        password_hash=hash_password("Password123!"),
        role="sales_employee",
        is_active=True,
    )
    db_session.add(cashier)
    db_session.commit()

    # 2. Create Customer
    customer = Customer(name="Tana Printing PLC", phone="+251911002233")
    db_session.add(customer)
    db_session.commit()

    now = datetime.now(timezone.utc)

    # Sale 1: Active Paid Sale (Cash 1,500 ETB)
    sale1 = Sale(
        sale_number="DLG-202611-0001",
        customer_id=customer.id,
        sale_date=now,
        subtotal=Decimal("1500.00"),
        discount=Decimal("0.00"),
        grand_total=Decimal("1500.00"),
        payment_status="paid",
        created_by=cashier.id,
    )
    db_session.add(sale1)
    db_session.flush()

    payment1 = Payment(
        sale_id=sale1.id,
        amount=Decimal("1500.00"),
        payment_method="cash",
        payment_date=now,
        recorded_by=cashier.id,
    )
    db_session.add(payment1)

    # Sale 2: Active Partial Sale (Total 5,000 ETB, Bank Transfer 2,000 ETB, Unpaid 3,000 ETB)
    sale2 = Sale(
        sale_number="DLG-202611-0002",
        customer_id=customer.id,
        sale_date=now,
        subtotal=Decimal("5000.00"),
        discount=Decimal("0.00"),
        grand_total=Decimal("5000.00"),
        payment_status="partial",
        created_by=cashier.id,
    )
    db_session.add(sale2)
    db_session.flush()

    payment2 = Payment(
        sale_id=sale2.id,
        amount=Decimal("2000.00"),
        payment_method="bank_transfer",
        payment_date=now,
        reference="CBE-TRX-9988",
        recorded_by=cashier.id,
    )
    db_session.add(payment2)

    # Sale 3: Pure Credit Sale (Total 2,500 ETB, 0 payments)
    sale3 = Sale(
        sale_number="DLG-202611-0003",
        customer_id=customer.id,
        sale_date=now,
        subtotal=Decimal("2500.00"),
        discount=Decimal("0.00"),
        grand_total=Decimal("2500.00"),
        payment_status="credit",
        created_by=cashier.id,
    )
    db_session.add(sale3)

    # Sale 4: VOIDED Sale (Total 10,000 ETB) — MUST BE EXCLUDED FROM DASHBOARD!
    sale4_voided = Sale(
        sale_number="DLG-202611-0004",
        customer_id=customer.id,
        sale_date=now,
        subtotal=Decimal("10000.00"),
        discount=Decimal("0.00"),
        grand_total=Decimal("10000.00"),
        payment_status="voided",
        created_by=cashier.id,
        voided_at=now,
        void_reason="Mistake in customer paper voucher",
    )
    db_session.add(sale4_voided)
    db_session.commit()

    # Login and query dashboard
    client.post(
        "/api/auth/login",
        json={"username": "cashier_abebe", "password": "Password123!"},
    )

    resp = client.get("/api/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    summary = data["summary"]

    # Today's Sales = Sale 1 (1500) + Sale 2 (5000) + Sale 3 (2500) = 9000.00 (Voided sale excluded!)
    assert Decimal(summary["today_sales"]) == Decimal("9000.00")

    # Cash Received = 1500.00
    assert Decimal(summary["cash_received"]) == Decimal("1500.00")

    # Bank Received = 2000.00
    assert Decimal(summary["bank_received"]) == Decimal("2000.00")

    # Credit Sales = Sale 3 (2500.00)
    assert Decimal(summary["credit_sales"]) == Decimal("2500.00")

    # Outstanding Balance = Total Active Sales (9000.00) - Total Payments (3500.00) = 5500.00
    assert Decimal(summary["outstanding_balance"]) == Decimal("5500.00")

    # Total Transactions Today = 3 active sales
    assert summary["total_transactions"] == 3

    # Check recent transactions: only 3 active sales
    assert len(data["recent_transactions"]) == 3
    sale_numbers = [tx["sale_number"] for tx in data["recent_transactions"]]
    assert "DLG-202611-0001" in sale_numbers
    assert "DLG-202611-0002" in sale_numbers
    assert "DLG-202611-0003" in sale_numbers
    assert "DLG-202611-0004" not in sale_numbers  # Voided sale MUST NOT be present
