"""add_tin_number_to_customers_and_buyer_tin_to_sales

Revision ID: cad59556fe48
Revises: 7aefda7760d1
Create Date: 2026-11-20 10:29:40.068656

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cad59556fe48'
down_revision: Union[str, None] = '7aefda7760d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("tin_number", sa.String(50), nullable=True))
    op.create_index("ix_customers_tin_number", "customers", ["tin_number"])

    op.add_column("sales", sa.Column("buyer_tin", sa.String(50), nullable=True))
    op.create_index("ix_sales_buyer_tin", "sales", ["buyer_tin"])


def downgrade() -> None:
    op.drop_index("ix_sales_buyer_tin", table_name="sales")
    op.drop_column("sales", "buyer_tin")

    op.drop_index("ix_customers_tin_number", table_name="customers")
    op.drop_column("customers", "tin_number")
