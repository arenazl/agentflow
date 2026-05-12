from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import date, datetime


def _se(v):
    return v.value if hasattr(v, "value") else v


class AutorizacionBase(BaseModel):
    propiedad_id: int
    fecha_firma: date
    fecha_vencimiento: date
    precio_minimo: float
    moneda: str = "USD"
    comision_pct: float = 4.0
    exclusividad: bool = False
    pdf_url: Optional[str] = None
    observaciones: Optional[str] = None
    estado: str = "activa"


class AutorizacionCreate(AutorizacionBase):
    captador_id: Optional[int] = None


class AutorizacionUpdate(BaseModel):
    fecha_vencimiento: Optional[date] = None
    precio_minimo: Optional[float] = None
    comision_pct: Optional[float] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None


class AutorizacionResponse(AutorizacionBase):
    id: int
    captador_id: int
    captador_nombre: Optional[str] = None
    propiedad_titulo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("estado")
    def _s(self, v):
        return _se(v)
