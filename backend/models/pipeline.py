from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Date, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from core.database import Base


class PipelineEtapa(str, enum.Enum):
    captado = "captado"
    publicado = "publicado"
    visita = "visita"
    reserva = "reserva"
    boleto = "boleto"
    escrituracion = "escrituracion"


class PipelineDeal(Base):
    __tablename__ = "pipeline_deals"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    propiedad_id = Column(Integer, ForeignKey("propiedades.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    etapa = Column(SAEnum(PipelineEtapa), nullable=False, default=PipelineEtapa.captado)
    precio_negociado = Column(Float, nullable=True)
    moneda = Column(String(3), nullable=False, default="USD")
    comision_estimada = Column(Float, nullable=True)
    probabilidad_pct = Column(Integer, nullable=False, default=10)
    fecha_estimada_cierre = Column(Date, nullable=True)
    notas = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", lazy="joined")
    propiedad = relationship("Propiedad", lazy="joined")
    vendedor = relationship("User", lazy="joined")
