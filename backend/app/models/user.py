from sqlalchemy import CheckConstraint, Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    fullname = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    concert_id = Column(Integer, nullable=True)
    # « admin » ou « organisateur » (voir app/auth/roles.py)
    role = Column(String(20), nullable=False, server_default="organisateur", default="organisateur")

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'organisateur')", name="ck_users_role_valeurs"),
        # transition : l'ancien module billetterie reconnaît l'admin à concert_id = 0
        CheckConstraint(
            "(role = 'admin') = (concert_id IS NOT DISTINCT FROM 0)",
            name="ck_users_role_admin_concert",
        ),
    )

