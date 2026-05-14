from pydantic import BaseModel, field_serializer
from typing import Optional, List
from datetime import datetime


def _se(v):
    return v.value if hasattr(v, "value") else v


# ---------- Mensaje ----------

class WhatsappMessageBase(BaseModel):
    contenido: str


class WhatsappMessageOutgoing(WhatsappMessageBase):
    """Lo que envia el frontend cuando un vendedor responde."""
    pass


class WhatsappMessageResponse(WhatsappMessageBase):
    id: int
    conversation_id: int
    direccion: str  # 'in' | 'out'
    sender_id: Optional[int] = None
    sender_nombre: Optional[str] = None
    enviado_at: datetime
    leido: bool
    meta_message_id: Optional[str] = None

    class Config:
        from_attributes = True

    @field_serializer("direccion")
    def _s(self, v):
        return _se(v)


# ---------- Conversacion ----------

class WhatsappConversationResponse(BaseModel):
    id: int
    telefono: str
    nombre_contacto: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    assignee_id: Optional[int] = None
    assignee_nombre: Optional[str] = None
    estado: str
    ultima_actividad: Optional[datetime] = None
    unread_count: int
    ultimo_mensaje: Optional[str] = None
    ultimo_mensaje_direccion: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("estado", "ultimo_mensaje_direccion", when_used="unless-none")
    def _s(self, v):
        return _se(v)


class WhatsappConversationDetailResponse(WhatsappConversationResponse):
    mensajes: List[WhatsappMessageResponse] = []


class WhatsappConversationUpdate(BaseModel):
    assignee_id: Optional[int] = None
    estado: Optional[str] = None
    cliente_id: Optional[int] = None
    nombre_contacto: Optional[str] = None


# ---------- Webhook mock ----------

class WhatsappMockIncoming(BaseModel):
    """Para simular un mensaje entrante sin tocar Meta."""
    telefono: str
    nombre_contacto: Optional[str] = None
    contenido: str


# ---------- Webhook real (Baileys -> AgentFlow) ----------

class BaileysIncomingPayload(BaseModel):
    """Payload que envia el servicio Baileys cuando recibe un mensaje real."""
    telefono: str  # +549... formato E.164
    nombre_contacto: Optional[str] = None
    contenido: str
    meta_message_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class BaileysOutboundResult(BaseModel):
    """Resultado de pedirle a Baileys que envie un mensaje."""
    ok: bool
    meta_message_id: Optional[str] = None
    error: Optional[str] = None
