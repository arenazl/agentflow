from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import date, datetime


def _se(v):
    return v.value if hasattr(v, "value") else v


class PipelineDealBase(BaseModel):
    cliente_id: int
    propiedad_id: int
    etapa: str = "captado"
    precio_negociado: Optional[float] = None
    moneda: str = "USD"
    comision_estimada: Optional[float] = None
    probabilidad_pct: int = 10
    fecha_estimada_cierre: Optional[date] = None
    notas: Optional[str] = None


class PipelineDealCreate(PipelineDealBase):
    vendedor_id: Optional[int] = None


class PipelineDealUpdate(BaseModel):
    etapa: Optional[str] = None
    precio_negociado: Optional[float] = None
    comision_estimada: Optional[float] = None
    probabilidad_pct: Optional[int] = None
    fecha_estimada_cierre: Optional[date] = None
    notas: Optional[str] = None


class PipelineDealResponse(PipelineDealBase):
    id: int
    vendedor_id: int
    vendedor_nombre: Optional[str] = None
    cliente_nombre: Optional[str] = None
    propiedad_titulo: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("etapa")
    def _s(self, v):
        return _se(v)
