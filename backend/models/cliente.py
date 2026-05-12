from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from core.database import Base


class ClienteEstado(str, enum.Enum):
    nuevo = "nuevo"
    contactado = "contactado"
    calificado = "calificado"
    cita = "cita"
    propuesta = "propuesta"
    cerrado = "cerrado"
    perdido = "perdido"


class ClienteTemperatura(str, enum.Enum):
    caliente = "caliente"
    tibio = "tibio"
    frio = "frio"


class ClienteOrigen(str, enum.Enum):
    web = "web"
    walk_in = "walk_in"
    referido = "referido"
    zonaprop = "zonaprop"
    argenprop = "argenprop"
    redes = "redes"
    otro = "otro"


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(150), nullable=True)
    telefono = Column(String(40), nullable=True)
    origen = Column(SAEnum(ClienteOrigen), nullable=False, default=ClienteOrigen.web)
    estado = Column(SAEnum(ClienteEstado), nullable=False, default=ClienteEstado.nuevo)
    temperatura = Column(SAEnum(ClienteTemperatura), nullable=True)

    # Preferencias del comprador
    pref_zona = Column(String(150), nullable=True)
    pref_m2_min = Column(Integer, nullable=True)
    pref_m2_max = Column(Integer, nullable=True)
    pref_ambientes = Column(Integer, nullable=True)
    pref_presupuesto_min = Column(Float, nullable=True)
    pref_presupuesto_max = Column(Float, nullable=True)
    pref_moneda = Column(String(3), nullable=False, default="USD")

    notas = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_contact_at = Column(DateTime(timezone=True), nullable=True)

    vendedor = relationship("User", lazy="joined")
