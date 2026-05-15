"""Enriquece el contextData del AI Coach con queries cross-cutting a la DB.

El frontend manda contextData de la pantalla actual. Este modulo lo expande con
señales de toda la app (leads sin responder, deals estancados, propiedades nuevas,
agentes online, etc.) para que el coach pueda dar tips relevantes incluso desde
una pantalla que no tiene esa data localmente.
"""
from datetime import datetime, timedelta
from typing import Dict, Any

from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User, UserRole
from models.cliente import Cliente
from models.propiedad import Propiedad, PropiedadEstado
from models.pipeline import PipelineDeal
from models.visita import Visita, VisitaEstado
from models.whatsapp import WhatsappConversation, WhatsappMessage, WaConversacionEstado, WaMensajeDireccion
from models.dmo import DmoLog


async def _leads_wa_sin_responder(db: AsyncSession, hours: int = 4) -> list:
    """Conversaciones WhatsApp donde el ultimo mensaje fue inbound hace +N horas
    y nadie respondio todavia."""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    # Trae las convs no cerradas/bloqueadas con ultima_actividad antes del cutoff
    r = await db.execute(
        select(WhatsappConversation)
        .where(
            and_(
                WhatsappConversation.estado.in_([WaConversacionEstado.nueva, WaConversacionEstado.abierta]),
                WhatsappConversation.ultima_actividad < cutoff,
                WhatsappConversation.ultima_actividad > cutoff - timedelta(days=3),
            )
        )
        .order_by(WhatsappConversation.ultima_actividad.asc())
        .limit(10)
    )
    out = []
    for c in r.scalars().all():
        # Verificar que ultimo msg sea inbound
        mr = await db.execute(
            select(WhatsappMessage)
            .where(WhatsappMessage.conversation_id == c.id)
            .order_by(desc(WhatsappMessage.enviado_at))
            .limit(1)
        )
        ultimo = mr.scalar_one_or_none()
        if not ultimo or ultimo.direccion != WaMensajeDireccion.inbound:
            continue
        horas_atras = int((datetime.utcnow() - c.ultima_actividad).total_seconds() / 3600)
        out.append({
            "conv_id": c.id,
            "contacto": c.nombre_contacto or c.telefono,
            "ultimo_mensaje": ultimo.contenido[:80],
            "horas_sin_responder": horas_atras,
            "assignee_id": c.assignee_id,
        })
    return out[:5]  # top 5 mas viejos


async def _deals_estancados(db: AsyncSession, dias: int = 21) -> list:
    cutoff = datetime.utcnow() - timedelta(days=dias)
    r = await db.execute(
        select(PipelineDeal)
        .where(PipelineDeal.updated_at < cutoff)
        .order_by(PipelineDeal.updated_at.asc())
        .limit(5)
    )
    out = []
    for d in r.scalars().all():
        dias_atras = int((datetime.utcnow() - d.updated_at).days)
        out.append({
            "deal_id": d.id,
            "etapa": d.etapa.value if hasattr(d.etapa, "value") else d.etapa,
            "cliente": d.cliente_nombre,
            "propiedad": d.propiedad_titulo,
            "dias_estancado": dias_atras,
            "comision_usd": d.comision_estimada or 0,
            "vendedor_id": d.vendedor_id,
        })
    return out


async def _propiedades_publicadas_hoy(db: AsyncSession) -> int:
    today = datetime.utcnow().date()
    r = await db.execute(
        select(func.count(Propiedad.id))
        .where(
            and_(
                Propiedad.estado == PropiedadEstado.publicada,
                func.date(Propiedad.created_at) == today,
            )
        )
    )
    return r.scalar_one() or 0


async def _agentes_online(db: AsyncSession) -> list:
    r = await db.execute(
        select(User)
        .where(
            and_(
                User.role == UserRole.vendedor,
                User.is_active == True,  # noqa: E712
                User.is_available == True,  # noqa: E712
            )
        )
    )
    return [{"id": u.id, "nombre": f"{u.nombre} {u.apellido}"} for u in r.scalars().all()]


async def _visitas_proximas_24h(db: AsyncSession, user_id: int | None = None) -> list:
    now = datetime.utcnow()
    horizon = now + timedelta(hours=24)
    stmt = (
        select(Visita)
        .where(
            and_(
                Visita.fecha_hora.between(now, horizon),
                Visita.estado == VisitaEstado.agendada,
            )
        )
        .order_by(Visita.fecha_hora.asc())
        .limit(8)
    )
    if user_id is not None:
        stmt = stmt.where(Visita.vendedor_id == user_id)
    r = await db.execute(stmt)
    out = []
    for v in r.scalars().all():
        out.append({
            "visita_id": v.id,
            "fecha_hora": v.fecha_hora.isoformat(),
            "cliente": v.cliente_nombre,
            "propiedad": v.propiedad_titulo,
            "vendedor_id": v.vendedor_id,
        })
    return out


async def _ranking_equipo_7d(db: AsyncSession) -> list:
    """Top 5 vendedores por % de bloques DMO completados en los ultimos 7 dias."""
    today = datetime.utcnow().date()
    cutoff = today - timedelta(days=7)

    # Conteo de logs por vendedor
    r = await db.execute(
        select(DmoLog.vendedor_id,
               func.count(DmoLog.id).label("total"),
               func.sum(func.cast(DmoLog.completado, type_=func.Integer)).label("completados"))
        .where(DmoLog.fecha >= cutoff)
        .group_by(DmoLog.vendedor_id)
    )
    rows = r.all()
    if not rows:
        return []

    # Mapear vendedor_id a nombre
    user_ids = [r[0] for r in rows]
    ur = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in ur.scalars().all()}

    out = []
    for vid, total, completados in rows:
        u = users_map.get(vid)
        if not u:
            continue
        pct = int(round(((completados or 0) / max(total, 1)) * 100))
        out.append({
            "vendedor_id": vid,
            "nombre": f"{u.nombre} {u.apellido}",
            "pct_completitud_7d": pct,
            "bloques_total": int(total),
            "bloques_ok": int(completados or 0),
        })
    out.sort(key=lambda x: -x["pct_completitud_7d"])
    return out[:5]


async def _stock_propio(db: AsyncSession, user_id: int) -> Dict[str, int]:
    r = await db.execute(
        select(func.count(Propiedad.id))
        .where(
            and_(
                Propiedad.captador_id == user_id,
                Propiedad.estado == PropiedadEstado.publicada,
            )
        )
    )
    return {"publicadas_propias": r.scalar_one() or 0}


async def enrich_context(db: AsyncSession, user: User, screen: str, base_context: Dict[str, Any]) -> Dict[str, Any]:
    """Recibe el contexto base que mando el frontend y lo expande con data global."""
    enriched = dict(base_context)
    try:
        enriched["_global"] = {
            "leads_wa_sin_responder_4h": await _leads_wa_sin_responder(db, hours=4),
            "deals_estancados_21d": await _deals_estancados(db, dias=21),
            "propiedades_publicadas_hoy": await _propiedades_publicadas_hoy(db),
            "agentes_online_ahora": await _agentes_online(db),
            "visitas_proximas_24h_oficina": await _visitas_proximas_24h(db),
            "ranking_equipo_7d": await _ranking_equipo_7d(db),
            "usuario_actual": {
                "id": user.id,
                "nombre": f"{user.nombre} {user.apellido}",
                "rol": user.role.value if hasattr(user.role, "value") else user.role,
            },
        }
        # Si es vendedor, agrego data personal
        if user.role == UserRole.vendedor:
            enriched["_personal"] = {
                "mis_visitas_24h": await _visitas_proximas_24h(db, user_id=user.id),
                **(await _stock_propio(db, user.id)),
            }
    except Exception as e:
        print(f"[coach_context] error enriqueciendo: {e}")
        enriched["_global"] = {"error": str(e)}
    return enriched
