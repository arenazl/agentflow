"""WhatsApp Business Inbox compartido - Fase 1 (sin IA)."""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from core.database import Base


class WaConversacionEstado(str, enum.Enum):
    nueva = "nueva"          # sin asignar ni respondida todavia
    abierta = "abierta"      # alguien la esta atendiendo
    cerrada = "cerrada"      # resuelta / archivada
    bloqueada = "bloqueada"  # spam / lead malo / bloquear


class WaMensajeDireccion(str, enum.Enum):
    inbound = "in"    # cliente -> Beyker
    outbound = "out"  # Beyker -> cliente


class WhatsappConversation(Base):
    __tablename__ = "whatsapp_conversations"

    id = Column(Integer, primary_key=True, index=True)
    telefono = Column(String(40), nullable=False, index=True)  # +549... formato E.164
    nombre_contacto = Column(String(150), nullable=True)       # nombre que muestra WA del contacto
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    estado = Column(SAEnum(WaConversacionEstado), nullable=False, default=WaConversacionEstado.nueva)
    ultima_actividad = Column(DateTime(timezone=True), nullable=True)
    unread_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", lazy="joined", foreign_keys=[cliente_id])
    assignee = relationship("User", lazy="joined", foreign_keys=[assignee_id])
    mensajes = relationship(
        "WhatsappMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="WhatsappMessage.enviado_at.asc()",
    )


class WhatsappMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    direccion = Column(SAEnum(WaMensajeDireccion), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # vendedor que envio si es outbound
    contenido = Column(Text, nullable=False)

    enviado_at = Column(DateTime(timezone=True), server_default=func.now())
    leido = Column(Boolean, nullable=False, default=False)
    meta_message_id = Column(String(150), nullable=True)  # id en Meta cuando no es mock

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("WhatsappConversation", back_populates="mensajes")
    sender = relationship("User", lazy="joined", foreign_keys=[sender_id])
