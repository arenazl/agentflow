from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Time, Text, Enum as SAEnum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from core.database import Base


class MetricaTipo(str, enum.Enum):
    """Tipo de metrica que reporta el vendedor al completar un bloque."""
    checkbox = "checkbox"
    cantidad = "cantidad"


class Coach(Base):
    """Autor / metodologia detras de un DMO (Tom Ferry, Buffini, Workman, custom)."""
    __tablename__ = "coaches"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False, unique=True)
    descripcion = Column(Text, nullable=True)
    foto_url = Column(String(500), nullable=True)
    fuente_url = Column(String(500), nullable=True)
    es_oficial = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    templates = relationship("DmoTemplate", back_populates="coach", cascade="all, delete-orphan")


class DmoTemplate(Base):
    """Un DMO concreto (puede haber varios por coach)."""
    __tablename__ = "dmo_templates"

    id = Column(Integer, primary_key=True, index=True)
    coach_id = Column(Integer, ForeignKey("coaches.id"), nullable=False)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    mercado = Column(String(40), nullable=True)
    activo = Column(Boolean, nullable=False, default=True)
    es_default_inmobiliaria = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    coach = relationship("Coach", back_populates="templates", lazy="joined")
    bloques = relationship(
        "DmoBloque",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="DmoBloque.orden",
    )


class DmoBloque(Base):
    """Bloque dentro de un template DMO."""
    __tablename__ = "dmo_bloques"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("dmo_templates.id"), nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    color = Column(String(20), nullable=False, default="#3b82f6")
    orden = Column(Integer, nullable=False, default=0)
    es_money_block = Column(Boolean, nullable=False, default=False)
    metrica_tipo = Column(SAEnum(MetricaTipo), nullable=False, default=MetricaTipo.checkbox)
    metrica_label = Column(String(60), nullable=True)
    metrica_meta = Column(Integer, nullable=False, default=0)

    template = relationship("DmoTemplate", back_populates="bloques", lazy="joined")


class VendedorDmoAssignment(Base):
    """Que template DMO sigue cada vendedor."""
    __tablename__ = "vendedor_dmo_assignments"
    __table_args__ = (UniqueConstraint("vendedor_id", name="uq_vendedor_assignment"),)

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("dmo_templates.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    vendedor = relationship("User", lazy="joined")
    template = relationship("DmoTemplate", lazy="joined")


class DmoLog(Base):
    """Reporte diario de un vendedor en un bloque."""
    __tablename__ = "dmo_logs"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bloque_id = Column(Integer, ForeignKey("dmo_bloques.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    completado = Column(Boolean, nullable=False, default=False)
    valor_metrica = Column(Integer, nullable=False, default=0)
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vendedor = relationship("User", lazy="joined")
    bloque = relationship("DmoBloque", lazy="joined")
