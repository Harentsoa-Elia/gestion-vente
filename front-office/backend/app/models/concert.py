from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Concert(Base):
    __tablename__ = "concerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    price_vip = Column(Float, nullable=False)
    price_adult = Column(Float, nullable=False)
    price_child = Column(Float, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)

    tickets = relationship("Ticket", back_populates="concert")