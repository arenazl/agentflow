from pydantic import BaseModel, field_serializer
from typing import Optional, List
from datetime import datetime


def _se(v):
    return v.value if hasattr(v, "value") else v


class FotoPropiedadResponse(BaseModel):
    id: int
    url: str
    orden: int

    class Config:
        from_attributes = True


class PropiedadBase(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    tipo: str = "departamento"
    direccion: str
    barrio: str
    ciudad: str = "Buenos Aires"
    lat: Optional[float] = None
    lng: Optional[float] = None
    m2_totales: int
    m2_cubiertos: Optional[int] = None
    ambientes: int = 2
    banos: int = 1
    cocheras: int = 0
    antiguedad: Optional[int] = None
    precio_publicacion: float
    moneda: str = "USD"
    estado: str = "captada"
    exclusividad: bool = False


class PropiedadCreate(PropiedadBase):
    captador_id: Optional[int] = None


class PropiedadUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    precio_publicacion: Optional[float] = None
    estado: Optional[str] = None
    ambientes: Optional[int] = None
    banos: Optional[int] = None
    m2_totales: Optional[int] = None


class PropiedadResponse(PropiedadBase):
    id: int
    captador_id: int
    captador_nombre: Optional[str] = None
    fotos: List[FotoPropiedadResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("tipo", "estado")
    def _s(self, v):
        return _se(v)
