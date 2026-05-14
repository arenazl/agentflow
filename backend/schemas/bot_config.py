from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BotConfigBase(BaseModel):
    # Tab 1: Datos empresa
    telefono_oficial: Optional[str] = None
    email_oficial: Optional[str] = None
    direccion: Optional[str] = None
    web: Optional[str] = None
    instagram: Optional[str] = None
    horario_semana: Optional[str] = None
    horario_sabado: Optional[str] = None
    horario_domingo: Optional[str] = None
    comision_compra_vendedor: Optional[str] = None
    comision_compra_comprador: Optional[str] = None
    comision_alquiler_propietario: Optional[str] = None
    comision_alquiler_inquilino: Optional[str] = None
    reserva_pct_estandar: Optional[str] = None
    reserva_plazo_aceptacion: Optional[str] = None
    # Tab 2: Conexion WhatsApp
    baileys_service_url: Optional[str] = None
    baileys_api_key: Optional[str] = None
    numero_oficial_wa: Optional[str] = None
    # Tab 3: Tono y reglas
    mensaje_bienvenida: Optional[str] = None
    mensaje_off_hours: Optional[str] = None
    tono_extra: Optional[str] = None
    palabras_derivacion_extra: Optional[str] = None
    # Tab 4: textareas
    identidad_extra: Optional[str] = None
    diferencial_extra: Optional[str] = None


class BotConfigResponse(BotConfigBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BaileysStatus(BaseModel):
    configurado: bool
    ok: bool
    baileys_ready: bool = False
    has_pending_qr: bool = False
    numero: Optional[str] = None
    last_checked: datetime
    error: Optional[str] = None


# ---- FAQ ----

class BotFaqBase(BaseModel):
    pregunta: str
    respuesta: str
    orden: int = 0
    activo: bool = True


class BotFaqCreate(BotFaqBase):
    pass


class BotFaqUpdate(BaseModel):
    pregunta: Optional[str] = None
    respuesta: Optional[str] = None
    orden: Optional[int] = None
    activo: Optional[bool] = None


class BotFaqResponse(BotFaqBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
