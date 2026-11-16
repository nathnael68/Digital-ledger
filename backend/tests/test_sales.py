import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import hash_password
from backend.app.models.customer import Customer
from backend.app.models.product import Product
from backend.app.models.user import User


def setup_authenticated_cashier(client: TestClient, db: Session) -> User:
    cashier = User(
        username=f"cashier_{uuid.uuid4().hex[:6]}",
        full_name="Almaz Cashier",
        password_hash=hash_password("Pass123!"),
        role="sales_employee",
        is_active=True,
    )
    db.add(cashier)
    db.commit()
    db.refresh(cashier)

    client.post(
        "/api/auth/login",
        json={"username": cashier.username, "password": "Pass123!"},
    )
    return cashier


def test_products_and_customers_search(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # 1. Product catalog search
    p_resp = client.get("/api/products/search?q=Paper")
    assert p_resp.status_code == 200
    products = p_resp.json()
    assert len(products) > 0
    assert any("Paper" in p["name"] for p in products)

    # 2. Customer search
    c_resp = client.get("/api/customers/search?q=Abyssinia")
    assert c_resp.status_code == 200
    customers = c_resp.json()
    assert len(customers) > 0
    assert customers[0]["name"] == "Abyssinia Graphic Design & Print"

    # 3. Quick customer creation
    new_c_resp = client.post(
        "/api/customers",
        json={
            "name": "Nile Printing House",
            "phone": "+251 91 888 7766",
            "address": "Arat Kilo, Addis Ababa",
        },
    )
    assert new_c_resp.status_code == 201
    assert new_c_resp.json()["name"] == "Nile Printing House"


def test_create_sale_catalog_and_manual_items(client: TestClient, db_session: Session):
    cashier = setup_authenticated_cashier(client, db_session)

    # Fetch a catalog product
    p_resp = client.get("/api/products/search?q=Thermal")
    assert p_resp.status_code == 200
    prod = p_resp.json()[0]

    payload = {
        "fs_number": "FS-2026-00451",
        "paper_receipt_number": "PR-99881",
        "notes": "Urgent order for print shop",
        "items": [
            {
                "product_id": prod["id"],
                "product_name": prod["name"],
                "unit": prod["unit"],
                "quantity": "5.000",
                "unit_price": "850.00",
            },
            {
                "product_id": None,
                "product_name": "Custom Glossy Laminating Roll 30micron",
                "unit": "roll",
                "quantity": "2.000",
                "unit_price": "1200.00",
            },
        ],
        "discount": "150.00",
        "initial_payment": {
            "payment_method": "cash",
            "amount": "6500.00",
            "reference": "Cash register 1",
        },
    }

    # Line 1: 5 * 850 = 4250.00
    # Line 2: 2 * 1200 = 2400.00
    # Subtotal: 6650.00
    # Discount: 150.00
    # Grand Total: 6500.00
    # Paid: 6500.00 -> Status: paid, Balance: 0.00

    resp = client.post("/api/sales", json=payload)
    assert resp.status_code == 201
    sale = resp.json()

    assert sale["sale_number"].startswith("DL-")
    assert sale["fs_number"] == "FS-2026-00451"
    assert sale["paper_receipt_number"] == "PR-99881"
    assert Decimal(sale["subtotal"]) == Decimal("6650.00")
    assert Decimal(sale["discount"]) == Decimal("150.00")
    assert Decimal(sale["grand_total"]) == Decimal("6500.00")
    assert Decimal(sale["amount_paid"]) == Decimal("6500.00")
    assert Decimal(sale["balance_due"]) == Decimal("0.00")
    assert sale["payment_status"] == "paid"
    assert len(sale["items"]) == 2
    assert len(sale["payments"]) == 1
    assert sale["created_by_name"] == cashier.full_name


def test_sale_validation_errors(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # 1. Missing or empty items list
    resp = client.post(
        "/api/sales",
        json={"fs_number": "FS-1234", "items": []},
    )
    assert resp.status_code == 422

    # 2. Missing FS number
    resp = client.post(
        "/api/sales",
        json={
            "fs_number": "",
            "items": [
                {
                    "product_name": "Test Item",
                    "unit": "pcs",
                    "quantity": "1",
                    "unit_price": "100.00",
                }
            ],
        },
    )
    assert resp.status_code == 422

    # 3. Negative quantity
    resp = client.post(
        "/api/sales",
        json={
            "fs_number": "FS-1234",
            "items": [
                {
                    "product_name": "Test Item",
                    "unit": "pcs",
                    "quantity": "-1",
                    "unit_price": "100.00",
                }
            ],
        },
    )
    assert resp.status_code == 422

    # 4. Negative unit price
    resp = client.post(
        "/api/sales",
        json={
            "fs_number": "FS-1234",
            "items": [
                {
                    "product_name": "Test Item",
                    "unit": "pcs",
                    "quantity": "1",
                    "unit_price": "-10.00",
                }
            ],
        },
    )
    assert resp.status_code == 422

    # 5. Discount exceeding subtotal
    resp = client.post(
        "/api/sales",
        json={
            "fs_number": "FS-1234",
            "discount": "500.00",
            "items": [
                {
                    "product_name": "Test Item",
                    "unit": "pcs",
                    "quantity": "1",
                    "unit_price": "200.00",
                }
            ],
        },
    )
    assert resp.status_code == 400
    assert "cannot exceed" in resp.json()["detail"]


def test_sale_payments_partial_and_subsequent(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # 1. Create a sale with partial payment
    payload = {
        "fs_number": "FS-000982",
        "items": [
            {
                "product_name": "Heavy Duty Offset Inks",
                "unit": "can",
                "quantity": "2",
                "unit_price": "2500.00",
            }
        ],
        "discount": "0.00",
        "initial_payment": {
            "payment_method": "bank_transfer",
            "amount": "2000.00",
            "reference": "TX-CBE-112233",
        },
    }
    # Grand total = 5000.00, Paid = 2000.00, Balance = 3000.00 -> partial
    resp = client.post("/api/sales", json=payload)
    assert resp.status_code == 201
    sale = resp.json()
    sale_id = sale["id"]
    assert sale["payment_status"] == "partial"
    assert Decimal(sale["balance_due"]) == Decimal("3000.00")

    # 2. Record overpayment (should fail with 400)
    overpay_resp = client.post(
        f"/api/sales/{sale_id}/payments",
        json={
            "payment_method": "cash",
            "amount": "4000.00",
            "reference": "Too much money",
        },
    )
    assert overpay_resp.status_code == 400
    assert "exceeds the remaining outstanding balance" in overpay_resp.json()["detail"]

    # 3. Record valid second payment (partial 1500)
    p2_resp = client.post(
        f"/api/sales/{sale_id}/payments",
        json={
            "payment_method": "cash",
            "amount": "1500.00",
            "reference": "Cash partial installment 2",
        },
    )
    assert p2_resp.status_code == 201

    # Check updated sale status
    sale_detail = client.get(f"/api/sales/{sale_id}").json()
    assert Decimal(sale_detail["amount_paid"]) == Decimal("3500.00")
    assert Decimal(sale_detail["balance_due"]) == Decimal("1500.00")
    assert sale_detail["payment_status"] == "partial"
    assert len(sale_detail["payments"]) == 2

    # 4. Record final payment (1500) -> status becomes paid
    p3_resp = client.post(
        f"/api/sales/{sale_id}/payments",
        json={
            "payment_method": "bank_transfer",
            "amount": "1500.00",
            "reference": "TX-TELEBIRR-888999",
        },
    )
    assert p3_resp.status_code == 201

    sale_detail = client.get(f"/api/sales/{sale_id}").json()
    assert Decimal(sale_detail["amount_paid"]) == Decimal("5000.00")
    assert Decimal(sale_detail["balance_due"]) == Decimal("0.00")
    assert sale_detail["payment_status"] == "paid"
    assert len(sale_detail["payments"]) == 3


def test_credit_sale_and_subsequent_settlement(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # Create credit sale (no initial payment)
    payload = {
        "fs_number": "FS-CREDIT-001",
        "items": [
            {
                "product_name": "Glossy Paper 200gsm",
                "unit": "pack",
                "quantity": "4",
                "unit_price": "1000.00",
            }
        ],
    }
    resp = client.post("/api/sales", json=payload)
    assert resp.status_code == 201
    sale = resp.json()
    assert sale["payment_status"] == "credit"
    assert Decimal(sale["amount_paid"]) == Decimal("0.00")
    assert Decimal(sale["balance_due"]) == Decimal("4000.00")

    # Pay in full
    pay_resp = client.post(
        f"/api/sales/{sale['id']}/payments",
        json={
            "payment_method": "cash",
            "amount": "4000.00",
            "reference": "Full settlement at counter",
        },
    )
    assert pay_resp.status_code == 201

    sale_detail = client.get(f"/api/sales/{sale['id']}").json()
    assert sale_detail["payment_status"] == "paid"
    assert Decimal(sale_detail["balance_due"]) == Decimal("0.00")


def test_transaction_correction_and_voiding(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # 1. Create a sale
    payload = {
        "fs_number": "FS-ORIGINAL-01",
        "paper_receipt_number": "PR-100",
        "notes": "Initial note",
        "items": [
            {
                "product_name": "A4 Paper",
                "unit": "box",
                "quantity": "1",
                "unit_price": "2400.00",
            }
        ],
    }
    resp = client.post("/api/sales", json=payload)
    assert resp.status_code == 201
    sale_id = resp.json()["id"]

    # 2. Correct transaction metadata (FS No., paper receipt, notes)
    correct_resp = client.put(
        f"/api/sales/{sale_id}",
        json={
            "fs_number": "FS-CORRECTED-99",
            "paper_receipt_number": "PR-100-REV",
            "notes": "Corrected per tax inspector review",
            "reason": "Typo in FS number on physical receipt",
        },
    )
    assert correct_resp.status_code == 200
    corrected = correct_resp.json()
    assert corrected["fs_number"] == "FS-CORRECTED-99"
    assert corrected["paper_receipt_number"] == "PR-100-REV"

    # 3. Void transaction
    void_resp = client.post(
        f"/api/sales/{sale_id}/void",
        json={"reason": "Customer cancelled order and goods not delivered"},
    )
    assert void_resp.status_code == 200
    voided = void_resp.json()
    assert voided["payment_status"] == "voided"
    assert voided["void_reason"] == "Customer cancelled order and goods not delivered"
    assert voided["voided_at"] is not None

    # 4. Attempting to record payment on voided sale must fail (400)
    pay_resp = client.post(
        f"/api/sales/{sale_id}/payments",
        json={
            "payment_method": "cash",
            "amount": "1000.00",
        },
    )
    assert pay_resp.status_code == 400
    assert "voided sale" in pay_resp.json()["detail"]


def test_sales_ledger_search_and_filters(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # Create distinct sales for ledger filtering
    client.post(
        "/api/sales",
        json={
            "fs_number": "FS-SEARCH-ALPHA",
            "paper_receipt_number": "PR-ALPHA-777",
            "items": [
                {
                    "product_name": "Special Cyan Ink Roll",
                    "unit": "roll",
                    "quantity": "1",
                    "unit_price": "1500.00",
                }
            ],
            "initial_payment": {"payment_method": "cash", "amount": "1500.00"},
        },
    )

    client.post(
        "/api/sales",
        json={
            "fs_number": "FS-SEARCH-BETA",
            "paper_receipt_number": "PR-BETA-888",
            "items": [
                {
                    "product_name": "Sticker Vinyl Glossy",
                    "unit": "roll",
                    "quantity": "2",
                    "unit_price": "3000.00",
                }
            ],
        },
    )

    # 1. Search by FS No
    res_fs = client.get("/api/sales?search=SEARCH-ALPHA")
    assert res_fs.status_code == 200
    items = res_fs.json()["items"]
    assert len(items) == 1
    assert items[0]["fs_number"] == "FS-SEARCH-ALPHA"

    # 2. Search by item description
    res_item = client.get("/api/sales?search=Vinyl")
    assert res_item.status_code == 200
    items = res_item.json()["items"]
    assert len(items) == 1
    assert items[0]["fs_number"] == "FS-SEARCH-BETA"

    # 3. Filter by status
    res_paid = client.get("/api/sales?payment_status=paid")
    assert res_paid.status_code == 200
    for s in res_paid.json()["items"]:
        assert s["payment_status"] == "paid"

    res_credit = client.get("/api/sales?payment_status=credit")
    assert res_credit.status_code == 200
    for s in res_credit.json()["items"]:
        assert s["payment_status"] == "credit"
