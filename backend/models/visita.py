from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from core.database import Base


class VisitaEstado(str, enum.Enum):
    agendada = "agendada"
    concretada = "concretada"
    cancelada = "cancelada"
    ausente = "ausente"


class VisitaResultado(str, enum.Enum):
    interesado = "interesado"
    no_interesado = "no_interesado"
    hizo_oferta = "hizo_oferta"
    indeciso = "indeciso"
    sin_resultado = "sin_resultado"


class Visita(Base):
    __tablename__ = "visitas"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    propiedad_id = Column(Integer, ForeignKey("propiedades.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    fecha_hora = Column(DateTime(timezone=True), nullable=False)
    estado = Column(SAEnum(VisitaEstado), nullable=False, default=VisitaEstado.agendada)
    resultado = Column(SAEnum(VisitaResultado), nullable=False, default=VisitaResultado.sin_resultado)

    notas_voz = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cliente = relationship("Cliente", lazy="joined")
    propiedad = relationship("Propiedad", lazy="joined")
    vendedor = relationship("User", lazy="joined")
