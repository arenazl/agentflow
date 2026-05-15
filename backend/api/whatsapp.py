"""Inbox compartido WhatsApp.

Fase 2: Baileys real + bot conversacional con Gemini.

Endpoints:
- GET    /conversations/                  lista filtrable
- GET    /conversations/{id}              detalle con mensajes
- PATCH  /conversations/{id}              asignar / cerrar / vincular cliente
- POST   /conversations/{id}/send         vendedor envia mensaje (via Baileys si esta activo)
- POST   /conversations/{id}/mark-read    marca mensajes como leidos
- POST   /mock/incoming                   simula mensaje entrante (solo dev)
- POST   /webhook/incoming                webhook que llama el servicio Baileys (auth API_KEY)
- GET    /agents/available                lista de agentes online ahora
"""
import os
import httpx
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, update
from sqlalchemy.orm import selectinload

from core.database import get_db, AsyncSessionLocal
from core.security import get_current_user
from models.user import User, UserRole
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
    BaileysIncomingPayload,
)
from services.whatsapp_bot import procesar_mensaje_entrante, derivar_a_humano


# Config Baileys: primero busca en bot_config (DB), si no usa env vars como fallback.
ENV_BAILEYS_URL = os.getenv("BAILEYS_SERVICE_URL", "")
ENV_API_KEY = os.getenv("WHATSAPP_WEBHOOK_API_KEY", "")


async def _get_baileys_config(db: AsyncSession) -> tuple[str, str]:
    """Devuelve (service_url, api_key) priorizando DB sobre env vars."""
    try:
        from models.bot_config import BotConfig
        r = await db.execute(select(BotConfig).where(BotConfig.id == 1))
        cfg = r.scalar_one_or_none()
        if cfg:
            return (cfg.baileys_service_url or ENV_BAILEYS_URL,
                    cfg.baileys_api_key or ENV_API_KEY)
    except Exception:
        pass
    return (ENV_BAILEYS_URL, ENV_API_KEY)


async def _send_via_baileys(db: AsyncSession, telefono: str, contenido: str) -> tuple[bool, Optional[str], Optional[str]]:
    """Llama al servicio Baileys para enviar un mensaje real.
    Devuelve (ok, meta_message_id, error)."""
    service_url, api_key = await _get_baileys_config(db)
    if not service_url:
        return (False, None, None)  # modo mock, no es error
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{service_url}/send",
                json={"telefono": telefono, "contenido": contenido},
                headers={"X-API-Key": api_key},
            )
            data = r.json()
            return (data.get("ok", False), data.get("meta_message_id"), data.get("error"))
    except Exception as e:
        return (False, None, str(e))


# Variable compartida para validar webhook entrante (que hace Baileys hacia AgentFlow)
WHATSAPP_WEBHOOK_API_KEY = ENV_API_KEY  # mantengo por compat con el codigo existente del webhook

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

    # Intentar enviar via Baileys si esta configurado, sino solo guardar (mock)
    ok, meta_id, err = await _send_via_baileys(db, c.telefono, payload.contenido)

    m = WhatsappMessage(
        conversation_id=conv_id,
        direccion=WaMensajeDireccion.outbound,
        sender_id=user.id,
        contenido=payload.contenido,
        leido=True,
        meta_message_id=meta_id,
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
    result = _msg_to_dict(m)
    result["sent_via_baileys"] = ok
    if err:
        result["baileys_error"] = err
    return result


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


@router.post("/webhook/incoming")
async def webhook_incoming(
    payload: BaileysIncomingPayload,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
):
    """Webhook real que llama el servicio Baileys cuando llega un mensaje al numero de Beyker.

    Flujo:
    1. Buscar o crear la conversacion.
    2. Vincular con un cliente existente si hay match por telefono.
    3. Guardar el mensaje entrante.
    4. Si la conv NO tiene assignee, el bot responde y eventualmente deriva.
    5. Si tiene assignee, simplemente notifica (el agente humano responde).
    """
    if WHATSAPP_WEBHOOK_API_KEY and x_api_key != WHATSAPP_WEBHOOK_API_KEY:
        raise HTTPException(401, "API key invalida")

    now = payload.timestamp or datetime.utcnow()

    # Idempotencia: si ya procesamos este meta_message_id, devolver OK sin re-procesar.
    # WhatsApp Multi-Device a veces entrega el mismo mensaje 2-3 veces.
    if payload.meta_message_id:
        dup = await db.execute(
            select(WhatsappMessage).where(WhatsappMessage.meta_message_id == payload.meta_message_id)
        )
        if dup.scalar_one_or_none():
            return {"ok": True, "duplicate": True, "meta_message_id": payload.meta_message_id}

    r = await db.execute(
        select(WhatsappConversation).where(WhatsappConversation.telefono == payload.telefono)
    )
    c = r.scalar_one_or_none()

    if not c:
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
        meta_message_id=payload.meta_message_id,
    )
    db.add(m)
    c.ultima_actividad = now
    c.unread_count = (c.unread_count or 0) + 1
    await db.flush()

    # Si la conversacion no tiene assignee, el bot toma la iniciativa
    bot_action = None
    bot_response_text = None
    derivado_a = None

    if c.assignee_id is None and c.estado != WaConversacionEstado.bloqueada:
        bot_response_text, bot_action = await procesar_mensaje_entrante(db, c, m)

        # Guardar la respuesta del bot como outbound (sender_id=None = bot)
        if bot_response_text:
            bot_msg = WhatsappMessage(
                conversation_id=c.id,
                direccion=WaMensajeDireccion.outbound,
                sender_id=None,  # bot
                contenido=bot_response_text,
                enviado_at=datetime.utcnow(),
                leido=True,
                meta_message_id=f"bot_{int(datetime.utcnow().timestamp() * 1000)}",
            )
            db.add(bot_msg)
            # Enviar via Baileys
            await _send_via_baileys(db, c.telefono, bot_response_text)

        if bot_action == "derivar":
            agente = await derivar_a_humano(db, c)
            if agente:
                derivado_a = f"{agente.nombre} {agente.apellido}"
                # Avisar al cliente que ya tiene asesor asignado
                handoff_msg = (
                    f"Listo, te derivo con {agente.nombre}, uno de nuestros asesores. "
                    "En un ratito te escribe."
                )
                m2 = WhatsappMessage(
                    conversation_id=c.id,
                    direccion=WaMensajeDireccion.outbound,
                    sender_id=None,
                    contenido=handoff_msg,
                    enviado_at=datetime.utcnow(),
                    leido=True,
                    meta_message_id=f"bot_handoff_{int(datetime.utcnow().timestamp() * 1000)}",
                )
                db.add(m2)
                await _send_via_baileys(db, c.telefono, handoff_msg)

                # === Notificacion al vendedor en su WhatsApp personal ===
                if agente.telefono_personal:
                    # Tomar los ultimos 4 mensajes del cliente para armar el resumen
                    last_msgs = await db.execute(
                        select(WhatsappMessage)
                        .where(
                            and_(
                                WhatsappMessage.conversation_id == c.id,
                                WhatsappMessage.direccion == WaMensajeDireccion.inbound,
                            )
                        )
                        .order_by(WhatsappMessage.enviado_at.desc())
                        .limit(4)
                    )
                    msgs_cliente = list(reversed(last_msgs.scalars().all()))
                    resumen = "\n".join(f"> {m.contenido[:100]}" for m in msgs_cliente)

                    contacto_label = c.nombre_contacto or c.telefono
                    notif_msg = (
                        f"[AgentFlow] Nuevo lead asignado\n\n"
                        f"Cliente: {contacto_label}\n"
                        f"Lo que pregunto:\n{resumen}\n\n"
                        f"Abri esta conversacion para responder:\n"
                        f"https://agentflow-beyker.netlify.app/inbox?conv={c.id}"
                    )
                    try:
                        await _send_via_baileys(db, agente.telefono_personal, notif_msg)
                    except Exception as e:
                        print(f"[notif vendedor] error: {e}")
            else:
                # Nadie disponible
                no_agent_msg = (
                    "Por ahora no tenemos asesores conectados. "
                    "En cuanto haya uno disponible te escribimos. ¡Gracias por la paciencia!"
                )
                m3 = WhatsappMessage(
                    conversation_id=c.id,
                    direccion=WaMensajeDireccion.outbound,
                    sender_id=None,
                    contenido=no_agent_msg,
                    enviado_at=datetime.utcnow(),
                    leido=True,
                    meta_message_id=f"bot_noagent_{int(datetime.utcnow().timestamp() * 1000)}",
                )
                db.add(m3)
                await _send_via_baileys(db, c.telefono, no_agent_msg)

    await db.commit()
    return {
        "ok": True,
        "conversation_id": c.id,
        "bot_action": bot_action,
        "derivado_a": derivado_a,
    }


@router.get("/agents/available")
async def list_available_agents(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista de vendedores que estan disponibles ahora para tomar leads."""
    r = await db.execute(
        select(User).where(
            and_(
                User.role == UserRole.vendedor,
                User.is_active == True,  # noqa: E712
                User.is_available == True,  # noqa: E712
            )
        ).order_by(User.last_assigned_at.asc().nulls_first())
    )
    agents = r.scalars().all()
    return [
        {
            "id": a.id,
            "nombre": a.nombre,
            "apellido": a.apellido,
            "last_assigned_at": a.last_assigned_at.isoformat() if a.last_assigned_at else None,
        }
        for a in agents
    ]
