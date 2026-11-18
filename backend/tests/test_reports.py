from datetime import datetime, time, timedelta
from decimal import Decimal
import io
import zoneinfo
import openpyxl
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import hash_password
from backend.app.models.customer import Customer
from backend.app.models.payment import Payment
from backend.app.models.sale import Sale
from backend.app.models.user import User

TZ_ADDIS = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)


@pytest.fixture
def admin_user(db_session: Session) -> User:
    user = User(
        username="admin",
        full_name="Abebe Admin",
        password_hash=hash_password("AdminPass123!"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def employee_user(db_session: Session) -> User:
    user = User(
        username="almaz_cashier",
        full_name="Almaz Cashier",
        password_hash=hash_password("AlmazPass123!"),
        role="sales_employee",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_auth_headers(client: TestClient, admin_user: User) -> dict[str, str]:
    res = client.post(
        "/api/auth/login",
        json={"username": admin_user.username, "password": "AdminPass123!"},
    )
    token = res.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def seeded_report_data(db_session: Session, admin_user: User, employee_user: User):
    """
    Seeds realistic business sales and payments across different days,
    payment methods, customers, and employees to verify all reporting metrics.
    """
    now_addis = datetime.now(TZ_ADDIS)
    today = now_addis.date()
    yesterday = today - timedelta(days=1)
    ten_days_ago = today - timedelta(days=10)

    # 1. Customers
    cust1 = Customer(
        name="Abyssinia Graphic Design",
        company_name="Abyssinia PLC",
        phone="0911223344",
        is_active=True,
    )
    cust2 = Customer(
        name="Tigist Book Printing",
        company_name="Tigist Enterprise",
        phone="0922334455",
        is_active=True,
    )
    db_session.add_all([cust1, cust2])
    db_session.flush()

    # 2. Sale 1 (Today): Paid Cash Sale by Admin
    t_today = datetime.combine(today, time(10, 30), tzinfo=TZ_ADDIS)
    sale1 = Sale(
        sale_number="DL-2026-0101",
        fs_number="000451",  # Leading zeros to verify text preservation
        paper_receipt_number="00101",
        customer_id=cust1.id,
        sale_date=t_today,
        subtotal=Decimal("5000.00"),
        discount=Decimal("200.00"),
        grand_total=Decimal("4800.00"),
        payment_status="paid",
        created_by=admin_user.id,
    )
    db_session.add(sale1)
    db_session.flush()

    pay1 = Payment(
        sale_id=sale1.id,
        amount=Decimal("4800.00"),
        payment_method="cash",
        payment_date=t_today,
        recorded_by=admin_user.id,
    )
    db_session.add(pay1)

    # 3. Sale 2 (Today): Partial Sale by Employee (Bank Transfer down payment)
    sale2 = Sale(
        sale_number="DL-2026-0102",
        fs_number="000452",
        paper_receipt_number="00102",
        customer_id=cust2.id,
        sale_date=t_today + timedelta(hours=1),
        subtotal=Decimal("10000.00"),
        discount=Decimal("0.00"),
        grand_total=Decimal("10000.00"),
        payment_status="partial",
        created_by=employee_user.id,
    )
    db_session.add(sale2)
    db_session.flush()

    pay2 = Payment(
        sale_id=sale2.id,
        amount=Decimal("4000.00"),
        payment_method="bank_transfer",
        reference="CBE-TRX-9988",
        payment_date=t_today + timedelta(hours=1),
        recorded_by=employee_user.id,
    )
    db_session.add(pay2)

    # 4. Sale 3 (Yesterday): Full Credit Sale by Employee (0 paid at creation)
    t_yest = datetime.combine(yesterday, time(14, 0), tzinfo=TZ_ADDIS)
    sale3 = Sale(
        sale_number="DL-2026-0099",
        fs_number="000449",
        customer_id=cust1.id,
        sale_date=t_yest,
        subtotal=Decimal("3000.00"),
        discount=Decimal("0.00"),
        grand_total=Decimal("3000.00"),
        payment_status="credit",
        created_by=employee_user.id,
    )
    db_session.add(sale3)
    db_session.flush()

    # 5. Sale 4 (10 Days Ago): Old credit sale, BUT subsequent payment recorded TODAY by Admin!
    t_old = datetime.combine(ten_days_ago, time(9, 0), tzinfo=TZ_ADDIS)
    sale4 = Sale(
        sale_number="DL-2026-0050",
        fs_number="000400",
        customer_id=cust2.id,
        sale_date=t_old,
        subtotal=Decimal("6000.00"),
        discount=Decimal("0.00"),
        grand_total=Decimal("6000.00"),
        payment_status="partial",
        created_by=employee_user.id,
    )
    db_session.add(sale4)
    db_session.flush()

    # Old initial payment 10 days ago
    pay4_old = Payment(
        sale_id=sale4.id,
        amount=Decimal("2000.00"),
        payment_method="cash",
        payment_date=t_old,
        recorded_by=employee_user.id,
    )
    # Subsequent payment received TODAY by Admin via Telebirr!
    pay4_today = Payment(
        sale_id=sale4.id,
        amount=Decimal("3000.00"),
        payment_method="telebirr",
        reference="TB-889900",
        payment_date=t_today + timedelta(hours=2),
        recorded_by=admin_user.id,
    )
    db_session.add_all([pay4_old, pay4_today])

    # 6. Sale 5 (Today): Voided Sale
    sale_void = Sale(
        sale_number="DL-2026-0103",
        fs_number="000453",
        customer_id=cust1.id,
        sale_date=t_today + timedelta(hours=3),
        subtotal=Decimal("2500.00"),
        discount=Decimal("0.00"),
        grand_total=Decimal("2500.00"),
        payment_status="voided",
        voided_at=t_today + timedelta(hours=3, minutes=10),
        void_reason="Cashier printer paper jam duplicate",
        created_by=admin_user.id,
    )
    db_session.add(sale_void)

    db_session.commit()
    return {
        "cust1": cust1,
        "cust2": cust2,
        "sale1": sale1,
        "sale2": sale2,
        "sale3": sale3,
        "sale4": sale4,
        "sale_void": sale_void,
    }


def test_daily_sales_report_and_kpis(client: TestClient, admin_auth_headers, seeded_report_data):
    """
    Verifies daily sales report accurately sums active sales revenue for today,
    separates cash vs bank collections, counts transactions, and isolates voided sales.
    """
    res = client.get("/api/reports/daily", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()

    summary = data["summary"]
    # Today's active sales: sale1 (4800) + sale2 (10000) = 14800 ETB. (sale_void is excluded!)
    assert Decimal(str(summary["total_sales_revenue"])) == Decimal("14800.00")
    assert summary["transaction_count"] == 2
    assert Decimal(str(summary["total_discounts"])) == Decimal("200.00")

    # Collections today:
    # Cash: pay1 (4800) = 4800 ETB
    assert Decimal(str(summary["cash_collections"])) == Decimal("4800.00")
    # Bank (including telebirr): pay2 (4000) + pay4_today (3000) = 7000 ETB!
    assert Decimal(str(summary["bank_collections"])) == Decimal("7000.00")

    # Voided sales: sale_void (2500)
    assert summary["voided_sales_count"] == 1
    assert Decimal(str(summary["voided_sales_amount"])) == Decimal("2500.00")

    # Transactions list
    tx_nums = [t["sale_number"] for t in data["transactions"]]
    assert "DL-2026-0101" in tx_nums
    assert "DL-2026-0102" in tx_nums
    assert "DL-2026-0103" not in tx_nums  # voided not in active transactions

    # Voided list
    assert len(data["voided_transactions"]) == 1
    assert data["voided_transactions"][0]["sale_number"] == "DL-2026-0103"
    assert data["voided_transactions"][0]["void_reason"] == "Cashier printer paper jam duplicate"


def test_payment_collections_reports_separation(client: TestClient, admin_auth_headers, seeded_report_data):
    """
    Verifies that cash collections and bank collections are strictly separated,
    and subsequent payments appear on payment date (not original sale date).
    """
    # 1. Cash Collections for today
    res_cash = client.get("/api/reports/cash-collections?period=today", headers=admin_auth_headers)
    assert res_cash.status_code == 200
    cash_data = res_cash.json()
    assert Decimal(str(cash_data["total_amount"])) == Decimal("4800.00")
    assert cash_data["payment_count"] == 1
    assert cash_data["items"][0]["payment_method"] == "cash"
    assert cash_data["items"][0]["sale_number"] == "DL-2026-0101"

    # 2. Bank Collections for today (includes transfer and telebirr)
    res_bank = client.get("/api/reports/bank-collections?period=today", headers=admin_auth_headers)
    assert res_bank.status_code == 200
    bank_data = res_bank.json()
    # 4000 (sale2 bank_transfer) + 3000 (sale4 telebirr) = 7000
    assert Decimal(str(bank_data["total_amount"])) == Decimal("7000.00")
    assert bank_data["payment_count"] == 2

    # Check that payment against sale4 (created 10 days ago) appears in TODAY's bank collections
    sale_nums = [item["sale_number"] for item in bank_data["items"]]
    assert "DL-2026-0050" in sale_nums
    assert "DL-2026-0102" in sale_nums


def test_credit_sales_report_initial_vs_current_balance(client: TestClient, admin_auth_headers, seeded_report_data):
    """
    Verifies credit sales report correctly identifies initial credit created
    versus current remaining balance.
    """
    res = client.get("/api/reports/credit-sales?period=this_month", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()

    # Sales with credit: sale2 (initial credit 6000), sale3 (initial credit 3000), sale4 (initial credit 4000)
    assert data["credit_sales_count"] >= 3
    items = {item["sale_number"]: item for item in data["items"]}

    # Sale 2: grand total 10000, initial paid 4000, initial credit 6000, current paid 4000, current balance 6000
    s2 = items["DL-2026-0102"]
    assert Decimal(str(s2["grand_total"])) == Decimal("10000.00")
    assert Decimal(str(s2["initial_amount_paid"])) == Decimal("4000.00")
    assert Decimal(str(s2["initial_credit_amount"])) == Decimal("6000.00")
    assert Decimal(str(s2["current_outstanding_balance"])) == Decimal("6000.00")

    # Sale 4: grand total 6000, initial paid 2000, initial credit 4000, current paid 5000 (2000+3000), current balance 1000!
    s4 = items["DL-2026-0050"]
    assert Decimal(str(s4["grand_total"])) == Decimal("6000.00")
    assert Decimal(str(s4["initial_credit_amount"])) == Decimal("4000.00")
    assert Decimal(str(s4["current_amount_paid"])) == Decimal("5000.00")
    assert Decimal(str(s4["current_outstanding_balance"])) == Decimal("1000.00")


def test_employee_activity_distinguishes_creator_from_recorder(
    client: TestClient, admin_auth_headers, seeded_report_data
):
    """
    Verifies that sales created by an employee are strictly distinguished
    from subsequent payment collections recorded by that employee.
    """
    res = client.get("/api/reports/employees?period=this_month", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()

    emps = {item["username"]: item for item in data["items"]}
    admin_emp = emps["admin"]
    sales_emp = emps["almaz_cashier"]

    # Admin created sale1 (4800 ETB, cash 4800)
    assert admin_emp["sales_created_count"] == 1
    assert Decimal(str(admin_emp["sales_revenue"])) == Decimal("4800.00")
    # Admin also recorded subsequent payment of 3000 on sale4!
    # So Admin's total collections = 4800 (sale1) + 3000 (sale4) = 7800
    assert Decimal(str(admin_emp["total_collections_recorded"])) == Decimal("7800.00")

    # Sales Employee created sale2 (10000), sale3 (3000), sale4 (6000) = 19000 ETB
    assert sales_emp["sales_created_count"] == 3
    assert Decimal(str(sales_emp["sales_revenue"])) == Decimal("19000.00")


def test_custom_date_range_validation(client: TestClient, admin_auth_headers):
    """
    Verifies rejection of invalid date ranges (start date after end date).
    """
    res = client.get(
        "/api/reports/custom-range?start_date=2026-11-20&end_date=2026-11-10",
        headers=admin_auth_headers,
    )
    assert res.status_code == 400
    assert "Start date cannot be after end date" in res.json()["detail"]


def test_excel_export_preserves_leading_zeros(client: TestClient, admin_auth_headers, seeded_report_data):
    """
    Verifies Excel export generates valid .xlsx workbook and formats FS numbers
    and receipt numbers as text strings, strictly preserving leading zeros like '000451'.
    """
    res = client.get("/api/reports/export/excel?report_type=daily_sales", headers=admin_auth_headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "delgone_daily_sales" in res.headers["content-disposition"]

    # Parse with openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(res.content))
    ws = wb.active
    assert ws is not None

    # Find the FS Number column
    header_row = [cell.value for cell in ws[5]]
    fs_col_idx = header_row.index("FS Number") + 1

    # Check cell values in rows 6 and 7
    fs_val1 = ws.cell(row=6, column=fs_col_idx).value
    fs_type1 = ws.cell(row=6, column=fs_col_idx).data_type
    assert fs_val1 in ("000451", "000452")
    assert str(fs_val1).startswith("000")  # Leading zeros preserved!
    assert fs_type1 == "s"  # String type in openpyxl


def test_pdf_export_structure_and_magic_bytes(client: TestClient, admin_auth_headers, seeded_report_data):
    """
    Verifies PDF export generates valid PDF stream with Delgone header.
    """
    res = client.get("/api/reports/export/pdf?report_type=daily_sales", headers=admin_auth_headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "delgone_daily_sales" in res.headers["content-disposition"]

    # PDF header signature check: starts with %PDF-
    assert res.content.startswith(b"%PDF-")
    assert len(res.content) > 1000
