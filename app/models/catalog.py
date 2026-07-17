from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    product_id = Column(String, primary_key=True, index=True)
    seller_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    has_video = Column(Boolean, default=False)

class Order(Base):
    __tablename__ = "orders"

    order_id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.product_id"), nullable=False)
    customer_id = Column(String, nullable=False)
    status = Column(String, default="Completed")  # Completed, Returned, Cancelled
    return_reason_code = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Review(Base):
    __tablename__ = "reviews"

    review_id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.product_id"), nullable=False)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class CustomerSignal(Base):
    __tablename__ = "customer_signals"

    signal_id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, nullable=False)
    product_id = Column(String, ForeignKey("products.product_id"), nullable=False)
    signal_type = Column(String, nullable=False)  # wishlisted, viewed_5_times
    created_at = Column(DateTime(timezone=True), server_default=func.now())