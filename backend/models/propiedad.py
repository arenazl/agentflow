from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from core.database import Base


class PropiedadEstado(str, enum.Enum):
    captada = "captada"
    publicada = "publicada"
    reservada = "reservada"
    vendida = "vendida"
    retirada = "retirada"


class PropiedadTipo(str, enum.Enum):
    departamento = "departamento"
    casa = "casa"
    ph = "ph"
    local = "local"
    oficina = "oficina"
    terreno = "terreno"
    cochera = "cochera"


class Propiedad(Base):
    __tablename__ = "propiedades"

    id = Column(Integer, primary_key=True, index=True)
    captador_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    tipo = Column(SAEnum(PropiedadTipo), nullable=False, default=PropiedadTipo.departamento)

    direccion = Column(String(200), nullable=False)
    barrio = Column(String(100), nullable=False)
    ciudad = Column(String(100), nullable=False, default="Buenos Aires")
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    m2_totales = Column(Integer, nullable=False)
    m2_cubiertos = Column(Integer, nullable=True)
    ambientes = Column(Integer, nullable=False, default=2)
    banos = Column(Integer, nullable=False, default=1)
    cocheras = Column(Integer, nullable=False, default=0)
    antiguedad = Column(Integer, nullable=True)

    precio_publicacion = Column(Float, nullable=False)
    moneda = Column(String(3), nullable=False, default="USD")

    estado = Column(SAEnum(PropiedadEstado), nullable=False, default=PropiedadEstado.captada)
    exclusividad = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    captador = relationship("User", lazy="joined")
    fotos = relationship("FotoPropiedad", back_populates="propiedad", cascade="all, delete-orphan", order_by="FotoPropiedad.orden")


class FotoPropiedad(Base):
    __tablename__ = "fotos_propiedad"

    id = Column(Integer, primary_key=True, index=True)
    propiedad_id = Column(Integer, ForeignKey("propiedades.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(500), nullable=False)
    orden = Column(Integer, nullable=False, default=0)

    propiedad = relationship("Propiedad", back_populates="fotos")
