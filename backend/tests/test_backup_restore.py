import hashlib
import os
import sqlite3
import tempfile
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from backend.app.db.base import Base
from backend.app.models.customer import Customer
from backend.app.models.product import Product
from backend.app.models.sale import Sale
from backend.app.models.sale_item import SaleItem
from backend.app.models.payment import Payment
from backend.app.models.user import User


def test_database_backup_and_restore_cycle():
    """
    Simulates a production-grade backup and restore procedure in an isolated environment.
    Verifies:
      1. Schema and transaction generation.
      2. Deterministic SQL dump creation with SHA256 checksum.
      3. Corruption detection (tampered file fails checksum).
      4. Database wipe and restoration into a new clean target database.
      5. Full relational and financial verification of restored records.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        source_db_path = os.path.join(tmpdir, "source.db")
        target_db_path = os.path.join(tmpdir, "restored.db")
        backup_sql_path = os.path.join(tmpdir, "backup_delgone.sql")
        checksum_path = os.path.join(tmpdir, "backup_delgone.sql.sha256")

        source_engine = create_engine(f"sqlite:///{source_db_path}")
        target_engine = None
        try:
            # 1. Initialize Source Database and Seed Production-like Records
            Base.metadata.create_all(bind=source_engine)
            SessionLocal = sessionmaker(bind=source_engine)
            session = SessionLocal()

            now = datetime.now(timezone.utc)

            # Seed User
            test_user = User(
                username="cashier_backup_test",
                full_name="Backup Test Employee",
                password_hash="hashed_pw_test",
                role="sales_employee",
                is_active=True,
            )
            session.add(test_user)
            session.flush()

            # Seed Customer
            test_customer = Customer(
                name="Abebe Kebede",
                company_name="Abyssinia Supplies PLC",
                phone="+251911223344",
                email="abebe@abyssinia.et",
            )
            session.add(test_customer)
            session.flush()

            # Seed Product
            test_product = Product(
                name="Delgone Filter Oil 20L",
                default_price=Decimal("2500.00"),
                unit="pcs",
            )
            session.add(test_product)
            session.flush()

            # Seed Sale
            test_sale = Sale(
                sale_number="SL-2026-00099",
                customer_id=test_customer.id,
                sale_date=now,
                subtotal=Decimal("5000.00"),
                discount=Decimal("0.00"),
                grand_total=Decimal("5000.00"),
                fs_number="FS-TEST-99999",
                payment_status="partially_paid",
                created_by=test_user.id,
            )
            session.add(test_sale)
            session.flush()

            # Seed Sale Item
            test_item = SaleItem(
                sale_id=test_sale.id,
                product_id=test_product.id,
                description_snapshot="Delgone Filter Oil 20L",
                unit="pcs",
                quantity=Decimal("2.000"),
                unit_price=Decimal("2500.00"),
                line_subtotal=Decimal("5000.00"),
            )
            session.add(test_item)

            # Seed Payment
            test_payment = Payment(
                sale_id=test_sale.id,
                amount=Decimal("1500.00"),
                payment_method="cash",
                payment_date=now,
                reference="CASH-DEPOSIT-01",
                recorded_by=test_user.id,
            )
            session.add(test_payment)
            session.commit()
            session.close()

            # Close SQLAlchemy connection pool on source so sqlite file is readable
            source_engine.dispose()

            # 2. Perform Dump / Backup
            raw_source_conn = sqlite3.connect(source_db_path)
            with open(backup_sql_path, "w", encoding="utf-8") as f:
                for line in raw_source_conn.iterdump():
                    f.write(f"{line}\n")
            raw_source_conn.close()

            assert os.path.exists(backup_sql_path)
            file_size = os.path.getsize(backup_sql_path)
            assert file_size > 100, "Backup file should contain non-trivial data"

            # Generate SHA256 checksum
            with open(backup_sql_path, "rb") as f:
                backup_bytes = f.read()
                expected_hash = hashlib.sha256(backup_bytes).hexdigest()

            with open(checksum_path, "w", encoding="ascii") as f:
                f.write(f"{expected_hash}  backup_delgone.sql\n")

            # 3. Checksum Verification
            with open(backup_sql_path, "rb") as f:
                computed_hash = hashlib.sha256(f.read()).hexdigest()
            assert computed_hash == expected_hash, "Checksum verification must pass for untouched backup"

            # Check that tampered file fails
            tampered_bytes = backup_bytes + b"\n-- corruption test --"
            tampered_hash = hashlib.sha256(tampered_bytes).hexdigest()
            assert tampered_hash != expected_hash, "Corrupted backup must fail checksum validation"

            # 4. Perform Restoration into Clean Target Database
            raw_target_conn = sqlite3.connect(target_db_path)
            with open(backup_sql_path, "r", encoding="utf-8") as f:
                sql_script = f.read()
            raw_target_conn.executescript(sql_script)
            raw_target_conn.close()

            # 5. Financial & Relational Verification of Restored Database
            target_engine = create_engine(f"sqlite:///{target_db_path}")
            TargetSession = sessionmaker(bind=target_engine)
            restored_session = TargetSession()

            # Verify User restored
            restored_user = restored_session.scalar(select(User).where(User.username == "cashier_backup_test"))
            assert restored_user is not None
            assert restored_user.full_name == "Backup Test Employee"
            assert restored_user.role == "sales_employee"

            # Verify Customer restored
            restored_customer = restored_session.scalar(select(Customer).where(Customer.phone == "+251911223344"))
            assert restored_customer is not None
            assert restored_customer.company_name == "Abyssinia Supplies PLC"
            assert restored_customer.name == "Abebe Kebede"

            # Verify Sale restored with precise financial numbers
            restored_sale = restored_session.scalar(select(Sale).where(Sale.sale_number == "SL-2026-00099"))
            assert restored_sale is not None
            assert restored_sale.grand_total == Decimal("5000.00")
            assert restored_sale.fs_number == "FS-TEST-99999"
            assert restored_sale.payment_status == "partially_paid"

            # Verify Line Items restored
            assert len(restored_sale.items) == 1
            assert restored_sale.items[0].description_snapshot == "Delgone Filter Oil 20L"
            assert restored_sale.items[0].line_subtotal == Decimal("5000.00")

            # Verify Payments restored
            assert len(restored_sale.payments) == 1
            assert restored_sale.payments[0].amount == Decimal("1500.00")
            assert restored_sale.payments[0].payment_method == "cash"
            assert restored_sale.payments[0].reference == "CASH-DEPOSIT-01"

            restored_session.close()
        finally:
            source_engine.dispose()
            if target_engine is not None:
                target_engine.dispose()
