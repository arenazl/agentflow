from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime


def _se(v):
    return v.value if hasattr(v, "value") else v


class VisitaBase(BaseModel):
    cliente_id: int
    propiedad_id: int
    fecha_hora: datetime
    estado: str = "agendada"
    resultado: str = "sin_resultado"
    notas_voz: Optional[str] = None


class VisitaCreate(VisitaBase):
    vendedor_id: Optional[int] = None


class VisitaUpdate(BaseModel):
    fecha_hora: Optional[datetime] = None
    estado: Optional[str] = None
    resultado: Optional[str] = None
    notas_voz: Optional[str] = None


class VisitaResponse(VisitaBase):
    id: int
    vendedor_id: int
    vendedor_nombre: Optional[str] = None
    cliente_nombre: Optional[str] = None
    propiedad_titulo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("estado", "resultado")
    def _s(self, v):
        return _se(v)
