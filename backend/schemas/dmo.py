from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import time, date, datetime


# ---------- Coach ----------

class CoachBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    foto_url: Optional[str] = None
    fuente_url: Optional[str] = None
    es_oficial: bool = False


class CoachCreate(CoachBase):
    pass


class CoachUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    foto_url: Optional[str] = None
    fuente_url: Optional[str] = None
    es_oficial: Optional[bool] = None


class CoachResponse(CoachBase):
    id: int
    created_at: datetime
    templates_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ---------- DMO Bloque ----------

class DmoBloqueBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    hora_inicio: time
    hora_fin: time
    color: str = "#3b82f6"
    orden: int = 0
    es_money_block: bool = False
    metrica_tipo: str = "checkbox"
    metrica_label: Optional[str] = None
    metrica_meta: int = 0


class DmoBloqueCreate(DmoBloqueBase):
    pass


class DmoBloqueResponse(DmoBloqueBase):
    id: int
    template_id: int

    class Config:
        from_attributes = True


# ---------- DMO Template ----------

class DmoTemplateBase(BaseModel):
    coach_id: int
    nombre: str
    descripcion: Optional[str] = None
    mercado: Optional[str] = None
    activo: bool = True
    es_default_inmobiliaria: bool = False


class DmoTemplateCreate(DmoTemplateBase):
    bloques: List[DmoBloqueCreate] = Field(default_factory=list)


class DmoTemplateUpdate(BaseModel):
    coach_id: Optional[int] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    mercado: Optional[str] = None
    activo: Optional[bool] = None
    es_default_inmobiliaria: Optional[bool] = None
    bloques: Optional[List[DmoBloqueCreate]] = None


class DmoTemplateResponse(DmoTemplateBase):
    id: int
    coach_nombre: Optional[str] = None
    bloques: List[DmoBloqueResponse] = Field(default_factory=list)
    asignaciones_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Asignacion vendedor -> template ----------

class VendedorAssignmentCreate(BaseModel):
    vendedor_id: int
    template_id: int


class VendedorAssignmentResponse(BaseModel):
    id: int
    vendedor_id: int
    vendedor_nombre: Optional[str] = None
    template_id: int
    template_nombre: Optional[str] = None
    coach_nombre: Optional[str] = None
    assigned_at: datetime

    class Config:
        from_attributes = True


# ---------- Log diario ----------

class DmoLogCreate(BaseModel):
    bloque_id: int
    fecha: date
    completado: bool = False
    valor_metrica: int = 0
    notas: Optional[str] = None


class DmoLogResponse(BaseModel):
    id: int
    vendedor_id: int
    bloque_id: int
    fecha: date
    completado: bool
    valor_metrica: int
    notas: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Dia (lo que renderiza /dmo) ----------

class DmoDiaResponse(BaseModel):
    fecha: date
    template: Optional[DmoTemplateResponse] = None
    bloques: List[DmoBloqueResponse]
    logs: List[DmoLogResponse]
    conversaciones_meta: int
    conversaciones_realizadas: int
    pct_completitud: int
