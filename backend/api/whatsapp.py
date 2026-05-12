"""Inbox compartido WhatsApp - Fase 1 (sin IA, sin Meta real).

Endpoints:
- GET    /conversations/                  lista filtrable
- GET    /conversations/{id}              detalle con mensajes
- PATCH  /conversations/{id}              asignar / cerrar / vincular cliente
- POST   /conversations/{id}/send         vendedor envia mensaje (mock: no llama a Meta)
- POST   /conversations/{id}/mark-read    marca mensajes como leidos
- POST   /mock/incoming                   simula mensaje entrante (solo dev)
- POST   /webhook                         endpoint que Meta llama (stub por ahora)
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, update
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.cliente import Cliente
from models.whatsapp import (
    WhatsappConversation,
    WhatsappMessage,
    WaConversacionEstado,
    WaMensajeDireccion,
)
from schemas.whatsapp import (
    WhatsappConversationResponse,
    WhatsappConversationDetailResponse,
    WhatsappConversationUpdate,
    WhatsappMessageOutgoing,
    WhatsappMessageResponse,
    WhatsappMockIncoming,
)

router = APIRouter()


def _msg_to_dict(m: WhatsappMessage) -> dict:
    d = WhatsappMessageResponse.model_validate(m).model_dump(mode="json")
    if m.sender:
        d["sender_nombre"] = f"{m.sender.nombre} {m.sender.apellido}"
    return d


def _conv_to_dict(c: WhatsappConversation, ultimo: Optional[WhatsappMessage] = None) -> dict:
    d = WhatsappConversationResponse.model_validate(c).model_dump(mode="json")
    if c.cliente:
        d["cliente_nombre"] = f"{c.cliente.nombre} {c.cliente.apellido}"
    if c.assignee:
        d["assignee_nombre"] = f"{c.assignee.nombre} {c.assignee.apellido}"
    if ultimo:
        d["ultimo_mensaje"] = ultimo.contenido[:200]
        d["ultimo_mensaje_direccion"] = ultimo.direccion.value if hasattr(ultimo.direccion, "value") else ultimo.direccion
    return d


@router.get("/conversations/")
async def list_conversations(
    estado: Optional[str] = Query(None, description="nueva | abierta | cerrada | bloqueada"),
    assignee_id: Optional[int] = Query(None),
    only_mine: bool = Query(False),
    only_unassigned: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(WhatsappConversation).order_by(desc(WhatsappConversation.ultima_actividad))
    filters = []
    if estado:
        filters.append(WhatsappConversation.estado == estado)
    if assignee_id is not None:
        filters.append(WhatsappConversation.assignee_id == assignee_id)
    if only_mine:
        filters.append(WhatsappConversation.assignee_id == user.id)
    if only_unassigned:
        filters.append(WhatsappConversation.assignee_id.is_(None))
    if filters:
        stmt = stmt.where(and_(*filters))

    result = await db.execute(stmt)
    convs = result.scalars().all()

    # Para cada conv, busco el ultimo mensaje
    out = []
    for c in convs:
        r = await db.execute(
            select(WhatsappMessage)
            .where(WhatsappMessage.conversation_id == c.id)
            .order_by(desc(WhatsappMessage.enviado_at))
            .limit(1)
        )
        ultimo = r.scalar_one_or_none()
        out.append(_conv_to_dict(c, ultimo))
    return out


@router.get("/conversations/{conv_id}", response_model=WhatsappConversationDetailResponse)
async def get_conversation(
    conv_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    r = await db.execute(
        select(WhatsappConversation)
        .options(selectinload(WhatsappConversation.mensajes).selectinload(WhatsappMessage.sender))
        .where(WhatsappConversation.id == conv_id)
    )
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Conversacion no encontrada")
    d = _conv_to_dict(c)
    d["mensajes"] = [_msg_to_dict(m) for m in c.mensajes]
    return d


@router.patch("/conversations/{conv_id}")
async def update_conversation(
    conv_id: int,
    payload: WhatsappConversationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = await db.execute(select(WhatsappConversation).where(WhatsappConversation.id == conv_id))
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Conversacion no encontrada")

    data = payload.model_dump(exclude_unset=True)
    if "assignee_id" in data:
        c.assignee_id = data["assignee_id"]
        # Cuando alguien la toma, pasa de 'nueva' a 'abierta'
        if c.assignee_id is not None and c.estado == WaConversacionEstado.nueva:
            c.estado = WaConversacionEstado.abierta
    if "estado" in data and data["estado"]:
        c.estado = data["estado"]
    if "cliente_id" in data:
        c.cliente_id = data["cliente_id"]
    if "nombre_contacto" in data:
        c.nombre_contacto = data["nombre_contacto"]

    await db.commit()
    await db.refresh(c)
    return _conv_to_dict(c)


@router.post("/conversations/{conv_id}/send")
async def send_message(
    conv_id: int,
    payload: WhatsappMessageOutgoing,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = await db.execute(select(WhatsappConversation).where(WhatsappConversation.id == conv_id))
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Conversacion no encontrada")

    # En Fase 1 mock: solo guardamos en DB, no llamamos a Meta.
    # En Fase 2/3 acá iría: httpx.post(meta_api_url, ...)
    m = WhatsappMessage(
        conversation_id=conv_id,
        direccion=WaMensajeDireccion.outbound,
        sender_id=user.id,
        contenido=payload.contenido,
        leido=True,
        meta_message_id=None,  # mock
    )
    db.add(m)

    # Si esta sin asignar, este vendedor la toma
    if c.assignee_id is None:
        c.assignee_id = user.id
    if c.estado == WaConversacionEstado.nueva:
        c.estado = WaConversacionEstado.abierta
    c.ultima_actividad = datetime.utcnow()

    await db.commit()
    await db.refresh(m)
    return _msg_to_dict(m)


@router.post("/conversations/{conv_id}/mark-read")
async def mark_read(
    conv_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await db.execute(
        update(WhatsappMessage)
        .where(
            and_(
                WhatsappMessage.conversation_id == conv_id,
                WhatsappMessage.direccion == WaMensajeDireccion.inbound,
                WhatsappMessage.leido == False,  # noqa: E712
            )
        )
        .values(leido=True)
    )
    await db.execute(
        update(WhatsappConversation)
        .where(WhatsappConversation.id == conv_id)
        .values(unread_count=0)
    )
    await db.commit()
    return {"ok": True}


@router.post("/mock/incoming")
async def mock_incoming(
    payload: WhatsappMockIncoming,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Simula un mensaje entrante. Equivalente a un webhook de Meta en Fase 2/3."""
    # Buscar conv existente por telefono
    r = await db.execute(
        select(WhatsappConversation).where(WhatsappConversation.telefono == payload.telefono)
    )
    c = r.scalar_one_or_none()

    now = datetime.utcnow()
    if not c:
        # Intentar vincular con un cliente existente
        cli_r = await db.execute(select(Cliente).where(Cliente.telefono == payload.telefono))
        cli = cli_r.scalar_one_or_none()
        c = WhatsappConversation(
            telefono=payload.telefono,
            nombre_contacto=payload.nombre_contacto,
            cliente_id=cli.id if cli else None,
            estado=WaConversacionEstado.nueva,
            ultima_actividad=now,
            unread_count=0,
        )
        db.add(c)
        await db.flush()

    m = WhatsappMessage(
        conversation_id=c.id,
        direccion=WaMensajeDireccion.inbound,
        contenido=payload.contenido,
        enviado_at=now,
        leido=False,
        meta_message_id=f"mock_{int(now.timestamp() * 1000)}",
    )
    db.add(m)

    c.ultima_actividad = now
    c.unread_count = (c.unread_count or 0) + 1

    await db.commit()
    await db.refresh(m)
    return {"conversation_id": c.id, "message_id": m.id}


@router.post("/webhook")
async def webhook(_: User = Depends(get_current_user)):
    """Stub del webhook real de Meta. Por ahora no procesa, solo responde 200."""
    # TODO Fase 2: parsear payload de Meta y crear mensajes inbound
    return {"ok": True, "note": "Fase 1 - webhook Meta sin conectar todavia"}
