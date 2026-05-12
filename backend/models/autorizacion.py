from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Date, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from core.database import Base


class AutorizacionEstado(str, enum.Enum):
    activa = "activa"
    vencida = "vencida"
    ejecutada = "ejecutada"
    cancelada = "cancelada"


class Autorizacion(Base):
    __tablename__ = "autorizaciones"

    id = Column(Integer, primary_key=True, index=True)
    propiedad_id = Column(Integer, ForeignKey("propiedades.id"), nullable=False)
    captador_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    fecha_firma = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)

    precio_minimo = Column(Float, nullable=False)
    moneda = Column(String(3), nullable=False, default="USD")
    comision_pct = Column(Float, nullable=False, default=4.0)
    exclusividad = Column(Boolean, nullable=False, default=False)

    pdf_url = Column(String(500), nullable=True)
    observaciones = Column(Text, nullable=True)
    estado = Column(SAEnum(AutorizacionEstado), nullable=False, default=AutorizacionEstado.activa)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    propiedad = relationship("Propiedad", lazy="joined")
    captador = relationship("User", lazy="joined")
