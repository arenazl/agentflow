from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime


def _serialize_enum(value):
    return value.value if hasattr(value, "value") else value


class ClienteBase(BaseModel):
    nombre: str
    apellido: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    origen: str = "web"
    estado: str = "nuevo"
    temperatura: Optional[str] = None
    pref_zona: Optional[str] = None
    pref_m2_min: Optional[int] = None
    pref_m2_max: Optional[int] = None
    pref_ambientes: Optional[int] = None
    pref_presupuesto_min: Optional[float] = None
    pref_presupuesto_max: Optional[float] = None
    pref_moneda: str = "USD"
    notas: Optional[str] = None


class ClienteCreate(ClienteBase):
    vendedor_id: Optional[int] = None


class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    origen: Optional[str] = None
    estado: Optional[str] = None
    temperatura: Optional[str] = None
    pref_zona: Optional[str] = None
    pref_m2_min: Optional[int] = None
    pref_m2_max: Optional[int] = None
    pref_ambientes: Optional[int] = None
    pref_presupuesto_min: Optional[float] = None
    pref_presupuesto_max: Optional[float] = None
    notas: Optional[str] = None


class ClienteResponse(ClienteBase):
    id: int
    vendedor_id: int
    vendedor_nombre: Optional[str] = None
    created_at: datetime
    last_contact_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_serializer("origen", "estado", "temperatura", when_used="unless-none")
    def _s(self, v):
        return _serialize_enum(v)
