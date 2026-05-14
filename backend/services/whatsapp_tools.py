"""Tools que el bot WhatsApp puede llamar para obtener datos en vivo de AgentFlow.

Gemini con function calling decide cuándo invocar cada una. El bot NUNCA inventa
datos específicos (precios, propiedades, disponibilidad) — siempre consulta acá.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.propiedad import Propiedad, FotoPropiedad, PropiedadEstado, PropiedadTipo
from models.user import User, UserRole
from models.cliente import Cliente
from models.visita import Visita, VisitaEstado, VisitaResultado


# ---------- Declaraciones de tools (formato Gemini function calling) ----------

TOOL_DECLARATIONS = [
    {
        "name": "buscar_propiedades",
        "description": (
            "Busca propiedades del stock real de Beyker que cumplan los filtros. "
            "Usar CUANDO el cliente pregunte por propiedades concretas, opciones disponibles, "
            "precios en una zona, etc. NUNCA inventes propiedades — usa siempre esta tool."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "zona": {
                    "type": "string",
                    "description": "Barrio o zona (ej: 'Palermo', 'Belgrano', 'Recoleta')",
                },
                "presupuesto_max_usd": {
                    "type": "integer",
                    "description": "Tope de precio en USD (ej: 180000)",
                },
                "presupuesto_min_usd": {
                    "type": "integer",
                    "description": "Piso de precio en USD",
                },
                "ambientes": {
                    "type": "integer",
                    "description": "Cantidad de ambientes (1 = monoambiente, 2 = 2 ambientes, etc.)",
                },
                "tipo": {
                    "type": "string",
                    "enum": ["departamento", "casa", "ph"],
                    "description": "Tipo de propiedad",
                },
                "limit": {
                    "type": "integer",
                    "description": "Cuantos resultados devolver (default 5, max 10)",
                },
            },
            "required": [],
        },
    },
    {
        "name": "consultar_propiedad",
        "description": (
            "Trae el detalle completo de UNA propiedad por su ID. Usar cuando el cliente "
            "pregunta especificamente por una propiedad que ya se le mostro o cuyo codigo conoce."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "propiedad_id": {"type": "integer", "description": "ID interno de la propiedad"},
            },
            "required": ["propiedad_id"],
        },
    },
    {
        "name": "agentes_disponibles_ahora",
        "description": (
            "Devuelve cuantos asesores estan online ahora mismo. Usar cuando vayas a derivar "
            "y necesites saber si hay alguien para tomar la conversacion."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "agendar_visita_tentativa",
        "description": (
            "Agenda una visita tentativa a una propiedad. La visita queda pendiente hasta que "
            "un asesor humano confirme. Usar cuando el cliente acepta ver una propiedad en una "
            "fecha/hora concreta."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "propiedad_id": {"type": "integer"},
                "telefono_cliente": {"type": "string", "description": "Telefono del cliente en formato +549..."},
                "fecha_propuesta": {
                    "type": "string",
                    "description": "Fecha y hora propuestas en formato ISO 8601 (ej: '2026-05-17T11:00')",
                },
                "nombre_cliente": {"type": "string", "description": "Nombre del cliente si se conoce"},
            },
            "required": ["propiedad_id", "telefono_cliente", "fecha_propuesta"],
        },
    },
]


# ---------- Implementaciones reales ----------

async def buscar_propiedades(
    db: AsyncSession,
    zona: Optional[str] = None,
    presupuesto_max_usd: Optional[int] = None,
    presupuesto_min_usd: Optional[int] = None,
    ambientes: Optional[int] = None,
    tipo: Optional[str] = None,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """Busca en la tabla propiedades con los filtros dados.
    Solo retorna propiedades en estado 'publicada' (no captadas, reservadas, vendidas).
    """
    limit = min(max(limit or 5, 1), 10)
    stmt = select(Propiedad).where(Propiedad.estado == PropiedadEstado.publicada)
    filters = []
    if zona:
        filters.append(Propiedad.barrio.ilike(f"%{zona}%"))
    if presupuesto_max_usd:
        filters.append(Propiedad.precio_publicacion <= presupuesto_max_usd)
    if presupuesto_min_usd:
        filters.append(Propiedad.precio_publicacion >= presupuesto_min_usd)
    if ambientes:
        filters.append(Propiedad.ambientes == ambientes)
    if tipo:
        try:
            t = PropiedadTipo(tipo.lower())
            filters.append(Propiedad.tipo == t)
        except ValueError:
            pass
    if filters:
        stmt = stmt.where(and_(*filters))
    stmt = stmt.limit(limit)

    r = await db.execute(stmt)
    props = r.scalars().all()

    return [
        {
            "id": p.id,
            "titulo": p.titulo,
            "tipo": p.tipo.value if hasattr(p.tipo, "value") else p.tipo,
            "direccion": p.direccion,
            "barrio": p.barrio,
            "ambientes": p.ambientes,
            "banos": p.banos,
            "m2_totales": p.m2_totales,
            "precio_usd": p.precio_publicacion,
            "exclusividad": p.exclusividad,
        }
        for p in props
    ]


async def consultar_propiedad(db: AsyncSession, propiedad_id: int) -> Optional[Dict[str, Any]]:
    r = await db.execute(select(Propiedad).where(Propiedad.id == propiedad_id))
    p = r.scalar_one_or_none()
    if not p:
        return None

    # Fotos
    fr = await db.execute(
        select(FotoPropiedad)
        .where(FotoPropiedad.propiedad_id == propiedad_id)
        .order_by(FotoPropiedad.orden)
        .limit(3)
    )
    fotos = [f.url for f in fr.scalars().all()]

    return {
        "id": p.id,
        "titulo": p.titulo,
        "descripcion": p.descripcion,
        "tipo": p.tipo.value if hasattr(p.tipo, "value") else p.tipo,
        "direccion": p.direccion,
        "barrio": p.barrio,
        "ciudad": p.ciudad,
        "ambientes": p.ambientes,
        "banos": p.banos,
        "cocheras": p.cocheras,
        "m2_totales": p.m2_totales,
        "m2_cubiertos": p.m2_cubiertos,
        "antiguedad": p.antiguedad,
        "precio_usd": p.precio_publicacion,
        "estado": p.estado.value if hasattr(p.estado, "value") else p.estado,
        "fotos": fotos,
    }


async def agentes_disponibles_ahora(db: AsyncSession) -> Dict[str, Any]:
    r = await db.execute(
        select(User).where(
            and_(
                User.role == UserRole.vendedor,
                User.is_active == True,  # noqa: E712
                User.is_available == True,  # noqa: E712
            )
        )
    )
    agents = r.scalars().all()
    return {
        "cantidad": len(agents),
        "nombres": [f"{a.nombre} {a.apellido}" for a in agents],
    }


async def agendar_visita_tentativa(
    db: AsyncSession,
    propiedad_id: int,
    telefono_cliente: str,
    fecha_propuesta: str,
    nombre_cliente: Optional[str] = None,
) -> Dict[str, Any]:
    """Crea una visita en estado 'agendada' vinculada al cliente identificado por telefono.
    Si el cliente no existe en la DB, lo crea como 'nuevo'.
    """
    # Buscar o crear cliente por telefono
    r = await db.execute(select(Cliente).where(Cliente.telefono == telefono_cliente))
    cliente = r.scalar_one_or_none()

    if not cliente:
        # Crear cliente basico
        partes = (nombre_cliente or "Cliente WhatsApp").split(" ", 1)
        nombre = partes[0]
        apellido = partes[1] if len(partes) > 1 else "(WhatsApp)"
        # Asignar al primer vendedor disponible
        vend_r = await db.execute(
            select(User).where(
                and_(
                    User.role == UserRole.vendedor,
                    User.is_active == True,  # noqa: E712
                )
            ).limit(1)
        )
        vendedor = vend_r.scalar_one_or_none()
        if not vendedor:
            return {"ok": False, "error": "No hay vendedores activos para asignar al cliente"}
        cliente = Cliente(
            vendedor_id=vendedor.id,
            nombre=nombre,
            apellido=apellido,
            telefono=telefono_cliente,
            origen="whatsapp",
            estado="nuevo",
        )
        db.add(cliente)
        await db.flush()

    # Verificar propiedad
    pr = await db.execute(select(Propiedad).where(Propiedad.id == propiedad_id))
    propiedad = pr.scalar_one_or_none()
    if not propiedad:
        return {"ok": False, "error": "Propiedad no existe"}

    # Parsear fecha
    try:
        fecha_dt = datetime.fromisoformat(fecha_propuesta.replace("Z", ""))
    except Exception:
        return {"ok": False, "error": f"Fecha invalida: {fecha_propuesta}"}

    visita = Visita(
        cliente_id=cliente.id,
        propiedad_id=propiedad_id,
        vendedor_id=cliente.vendedor_id,
        fecha_hora=fecha_dt,
        estado=VisitaEstado.agendada,
        resultado=VisitaResultado.sin_resultado,
        notas_voz="Agendada por el bot WhatsApp, pendiente de confirmacion del asesor.",
    )
    db.add(visita)
    await db.flush()

    return {
        "ok": True,
        "visita_id": visita.id,
        "cliente_id": cliente.id,
        "fecha": fecha_dt.isoformat(),
        "vendedor": f"Vendedor #{cliente.vendedor_id}",
    }


# ---------- Dispatcher ----------

async def execute_tool(db: AsyncSession, name: str, args: dict) -> Any:
    """Ejecuta una tool por nombre. Devuelve el resultado serializable."""
    if name == "buscar_propiedades":
        return await buscar_propiedades(db, **args)
    if name == "consultar_propiedad":
        return await consultar_propiedad(db, **args)
    if name == "agentes_disponibles_ahora":
        return await agentes_disponibles_ahora(db)
    if name == "agendar_visita_tentativa":
        return await agendar_visita_tentativa(db, **args)
    return {"error": f"Tool desconocida: {name}"}
