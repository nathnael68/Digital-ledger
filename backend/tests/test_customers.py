import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import hash_password
from backend.app.models.audit_log import AuditLog
from backend.app.models.customer import Customer
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


def test_customer_creation_and_validation(client: TestClient, db_session: Session):
    cashier = setup_authenticated_cashier(client, db_session)

    # 1. Successful creation with full contact fields
    payload = {
        "name": "Dawit Haile",
        "company_name": "Nile Graphics & Advertising",
        "phone": "+251 91 199 8877",
        "alt_phone": "0115512233",
        "email": "contact@nilegraphics.et",
        "address": "Arada Sub-City, Piazza",
        "notes": "Premium client for UV printing rolls",
    }
    resp = client.post("/api/customers", json=payload)
    assert resp.status_code == 201
    cust = resp.json()
    assert cust["name"] == "Dawit Haile"
    assert cust["company_name"] == "Nile Graphics & Advertising"
    assert cust["phone"] == "+251 91 199 8877"
    assert cust["email"] == "contact@nilegraphics.et"
    assert cust["is_active"] is True

    # 2. Check audit log was written
    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_id == cust["id"], AuditLog.action == "CREATE"
    ).first()
    assert audit is not None
    assert audit.user_id == cashier.id

    # 3. Validation: Invalid email format
    bad_email = client.post(
        "/api/customers",
        json={"name": "Bad Email Client", "email": "not-an-email"},
    )
    assert bad_email.status_code == 422

    # 4. Validation: Invalid phone format
    bad_phone = client.post(
        "/api/customers",
        json={"name": "Bad Phone Client", "phone": "123"},
    )
    assert bad_phone.status_code == 422


def test_customer_duplicate_detection_warning(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # 1. Create original customer
    client.post(
        "/api/customers",
        json={
            "name": "Yared Mekonnen",
            "company_name": "Addis Print Solutions",
            "phone": "+251 91 777 6655",
            "email": "yared@addisprint.com",
        },
    )

    # 2. Attempt duplicate creation with same phone (without confirm_duplicate) -> 409 Conflict
    dup_resp = client.post(
        "/api/customers",
        json={
            "name": "Yared M.",
            "company_name": "Different Company",
            "phone": "+251 91 777 6655",
        },
    )
    assert dup_resp.status_code == 409
    data = dup_resp.json()["detail"]
    assert data["is_duplicate"] is True
    assert "Possible duplicate customer record detected" in data["message"]
    assert len(data["matches"]) >= 1

    # 3. Pre-submission check endpoint returns warning without error
    check_resp = client.get(
        "/api/customers/check-duplicate",
        params={"name": "Yared M.", "phone": "+251 91 777 6655"},
    )
    assert check_resp.status_code == 200
    check_data = check_resp.json()
    assert check_data["is_duplicate"] is True
    assert len(check_data["matches"]) >= 1

    # 4. Explicit confirmation allows creation without merging
    confirm_resp = client.post(
        "/api/customers",
        json={
            "name": "Yared M.",
            "company_name": "Different Company",
            "phone": "+251 91 777 6655",
            "confirm_duplicate": True,
        },
    )
    assert confirm_resp.status_code == 201
    assert confirm_resp.json()["name"] == "Yared M."


def test_customer_update_and_status_toggle(client: TestClient, db_session: Session):
    cashier = setup_authenticated_cashier(client, db_session)

    # 1. Create Customer
    c_resp = client.post(
        "/api/customers",
        json={
            "name": "Biruk Assefa",
            "company_name": "Piazza Stationers",
            "phone": "+251 91 444 3322",
        },
    )
    cust_id = c_resp.json()["id"]

    # 2. Update Customer details
    up_resp = client.put(
        f"/api/customers/{cust_id}",
        json={
            "company_name": "Piazza Stationers PLC",
            "phone": "+251 91 444 3322",
            "alt_phone": "+251 11 122 3344",
            "address": "Arada Sub-City",
            "reason": "Customer registered as PLC and provided landline",
        },
    )
    assert up_resp.status_code == 200
    updated = up_resp.json()
    assert updated["company_name"] == "Piazza Stationers PLC"
    assert updated["alt_phone"] == "+251 11 122 3344"

    # Verify update audit log
    audit_update = db_session.query(AuditLog).filter(
        AuditLog.entity_id == cust_id, AuditLog.action == "UPDATE"
    ).first()
    assert audit_update is not None
    assert audit_update.reason == "Customer registered as PLC and provided landline"

    # 3. Deactivate customer
    deact_resp = client.patch(
        f"/api/customers/{cust_id}/status",
        json={"is_active": False, "reason": "Temporarily closed operations"},
    )
    assert deact_resp.status_code == 200
    assert deact_resp.json()["is_active"] is False

    # 4. Verify deactivated customer cannot be selected for new sale
    bad_sale = client.post(
        "/api/sales",
        json={
            "fs_number": "FS-2026-INACTIVE-TEST",
            "customer_id": cust_id,
            "items": [
                {
                    "product_name": "A4 Paper",
                    "unit": "box",
                    "quantity": 1,
                    "unit_price": "2400.00",
                }
            ],
        },
    )
    assert bad_sale.status_code == 400
    assert "inactive" in bad_sale.json()["detail"].lower()

    # 5. Reactivate customer
    react_resp = client.patch(
        f"/api/customers/{cust_id}/status",
        json={"is_active": True, "reason": "Account reopened"},
    )
    assert react_resp.status_code == 200
    assert react_resp.json()["is_active"] is True


def test_customer_financial_summary_and_void_exclusion(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # 1. Create Customer
    c_resp = client.post(
        "/api/customers",
        json={
            "name": "Selam Print Shop",
            "company_name": "Selam Enterprise",
            "phone": "+251 91 333 2211",
        },
    )
    cust_id = c_resp.json()["id"]

    # 2. Financial summary for new customer should be all zeros
    fin_empty = client.get(f"/api/customers/{cust_id}/financial-summary").json()
    assert fin_empty["total_sales_revenue"] == "0.00"
    assert fin_empty["total_payments_received"] == "0.00"
    assert fin_empty["outstanding_balance"] == "0.00"
    assert fin_empty["total_sales_count"] == 0

    # 3. Record Sale 1: Fully Paid Cash (2,000 ETB)
    client.post(
        "/api/sales",
        json={
            "fs_number": "FS-SELAM-001",
            "customer_id": cust_id,
            "items": [
                {
                    "product_name": "Thermal Paper Roll",
                    "unit": "pack",
                    "quantity": 2,
                    "unit_price": "1000.00",
                }
            ],
            "initial_payment": {"payment_method": "cash", "amount": "2000.00"},
        },
    )

    # 4. Record Sale 2: Partial (5,000 ETB, paid 2,000 ETB, balance 3,000 ETB)
    s2_resp = client.post(
        "/api/sales",
        json={
            "fs_number": "FS-SELAM-002",
            "customer_id": cust_id,
            "items": [
                {
                    "product_name": "Glossy Vinyl Roll",
                    "unit": "roll",
                    "quantity": 1,
                    "unit_price": "5000.00",
                }
            ],
            "initial_payment": {"payment_method": "bank_transfer", "amount": "2000.00", "reference": "CBE-11"},
        },
    )
    s2_id = s2_resp.json()["id"]

    # 5. Record Sale 3: VOIDED Sale (8,000 ETB) — MUST BE EXCLUDED FROM ACTIVE TOTALS
    s3_resp = client.post(
        "/api/sales",
        json={
            "fs_number": "FS-SELAM-003-VOID",
            "customer_id": cust_id,
            "items": [
                {
                    "product_name": "High End Printing Machine Inks",
                    "unit": "can",
                    "quantity": 4,
                    "unit_price": "2000.00",
                }
            ],
            "initial_payment": {"payment_method": "cash", "amount": "8000.00"},
        },
    )
    s3_id = s3_resp.json()["id"]
    client.post(f"/api/sales/{s3_id}/void", json={"reason": "Customer cancelled order before dispatch"})

    # Check updated financial summary
    fin = client.get(f"/api/customers/{cust_id}/financial-summary").json()
    # Active Revenue = Sale 1 (2,000) + Sale 2 (5,000) = 7,000.00 (Voided 8,000 excluded)
    assert Decimal(fin["total_sales_revenue"]) == Decimal("7000.00")
    # Total Paid = 2,000 + 2,000 = 4,000.00
    assert Decimal(fin["total_payments_received"]) == Decimal("4000.00")
    # Balance = 7,000 - 4,000 = 3,000.00
    assert Decimal(fin["outstanding_balance"]) == Decimal("3000.00")
    assert fin["total_sales_count"] == 2
    assert fin["paid_sales_count"] == 1
    assert fin["partial_sales_count"] == 1
    assert fin["voided_sales_count"] == 1

    # 6. Check Customer Sales History endpoint: All 3 sales appear, voided is marked
    sales_history = client.get(f"/api/customers/{cust_id}/sales").json()
    assert sales_history["total"] == 3
    voided_items = [s for s in sales_history["items"] if s["payment_status"] == "voided"]
    assert len(voided_items) == 1
    assert voided_items[0]["id"] == s3_id

    # 7. Check Customer Payment History endpoint
    pay_history = client.get(f"/api/customers/{cust_id}/payments").json()
    # Payments for sales are listed chronologically
    assert pay_history["total"] >= 2


def test_customer_outstanding_receivables_and_aging(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # 1. Create a customer with outstanding credit
    c_resp = client.post(
        "/api/customers",
        json={
            "name": "Bole Graphics Lab",
            "company_name": "Bole Commercial",
            "phone": "+251 91 999 1122",
        },
    )
    cust_id = c_resp.json()["id"]

    # Create an unpaid sale
    client.post(
        "/api/sales",
        json={
            "fs_number": "FS-BOLE-OUT-01",
            "customer_id": cust_id,
            "items": [
                {
                    "product_name": "Offset Process Ink Cyan",
                    "unit": "can",
                    "quantity": 2,
                    "unit_price": "1800.00",
                }
            ],
        },
    )

    # Query outstanding balances endpoint
    out_resp = client.get("/api/customers/outstanding?search=Bole+Graphics")
    assert out_resp.status_code == 200
    out_data = out_resp.json()
    assert out_data["total"] >= 1
    item = out_data["items"][0]
    assert item["name"] == "Bole Graphics Lab"
    assert Decimal(item["outstanding_balance"]) == Decimal("3600.00")
    assert item["unpaid_sales_count"] >= 1
    assert Decimal(item["age_0_30_days"]) == Decimal("3600.00")
    assert item["primary_aging_category"] == "0-30 days"


def test_advanced_sales_ledger_search_and_sorting(client: TestClient, db_session: Session):
    setup_authenticated_cashier(client, db_session)

    # Create customer with company name
    c_resp = client.post(
        "/api/customers",
        json={
            "name": "Kidus Solomon",
            "company_name": "Apex Marketing Group",
            "phone": "+251 91 888 4433",
        },
    )
    cust_id = c_resp.json()["id"]

    # Sale 1: With leading zeros in FS No
    client.post(
        "/api/sales",
        json={
            "fs_number": "0009876-FS",
            "customer_id": cust_id,
            "paper_receipt_number": "PR-APEX-01",
            "items": [
                {
                    "product_name": "Glossy Photo Paper A4 220gsm",
                    "unit": "pack",
                    "quantity": 10,
                    "unit_price": "980.00",
                }
            ],
            "initial_payment": {"payment_method": "cash", "amount": "9800.00"},
        },
    )

    # 1. Search by exact leading zeros in FS No
    res_fs = client.get("/api/sales?search=0009876-FS").json()
    assert res_fs["total"] == 1
    assert res_fs["items"][0]["fs_number"] == "0009876-FS"

    # 2. Search by company name
    res_comp = client.get("/api/sales?search=Apex+Marketing").json()
    assert res_comp["total"] >= 1
    assert res_comp["items"][0]["customer_company_name"] == "Apex Marketing Group"

    # 3. Search by customer phone
    res_phone = client.get("/api/sales?search=888+4433").json()
    assert res_phone["total"] >= 1

    # 4. Filter by transaction_status
    res_act = client.get("/api/sales?transaction_status=active").json()
    assert all(s["voided_at"] is None for s in res_act["items"])

    # 5. Sorting by grand_total desc
    res_sort = client.get("/api/sales?sort_by=grand_total&sort_order=desc").json()
    totals = [Decimal(s["grand_total"]) for s in res_sort["items"]]
    assert totals == sorted(totals, reverse=True)
