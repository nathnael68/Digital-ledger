from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class SaleSequence(Base):
    __tablename__ = "sale_sequences"

    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    current_number: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
