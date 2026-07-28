import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL, DateTime, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class BookingStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    DOCS_VERIFIED = "DOCS_VERIFIED"
    APPROVED = "APPROVED"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"

class PaymentStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    RECEIVED = "RECEIVED"
    OVERDUE = "OVERDUE"

class PaymentModeEnum(str, enum.Enum):
    CASH = "CASH"
    CHEQUE = "CHEQUE"
    BANK_TRANSFER = "BANK_TRANSFER"
    UPI_REFERENCE = "UPI_REFERENCE"

class DiscountStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(Enum(BookingStatusEnum), default=BookingStatusEnum.PENDING, index=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    unit = relationship("Unit")
    customer = relationship("Customer")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    payments = relationship("Payment", back_populates="booking")
    # discounts are fetched via the bookings router since ApprovalRequest links via JSON payload

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    amount = Column(DECIMAL(12, 2), nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(Enum(PaymentStatusEnum), default=PaymentStatusEnum.PENDING, index=True)
    mode = Column(Enum(PaymentModeEnum), nullable=True)
    received_date = Column(Date, nullable=True)
    receipt_number = Column(String(100), nullable=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    booking = relationship("Booking", back_populates="payments")
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])
