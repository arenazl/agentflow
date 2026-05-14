from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
import enum

from core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    gerente = "gerente"
    vendedor = "vendedor"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    telefono = Column(String(40), nullable=True)
    foto_url = Column(String(500), nullable=True)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.vendedor)
    meta_conversaciones_diaria = Column(Integer, nullable=False, default=20)
    is_active = Column(Boolean, nullable=False, default=True)
    is_available = Column(Boolean, nullable=False, default=False)
    last_assigned_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
