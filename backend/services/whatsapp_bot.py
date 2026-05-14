"""Bot conversacional WhatsApp con knowledge base + function calling.

Arquitectura:
1. Al import-time se cargan TODOS los .md de backend/knowledge/ en memoria.
2. En cada mensaje entrante, el bot recibe:
   - system_instruction: tono + reglas anti-alucinacion + knowledge base completa
   - historial de la conversacion
   - tools disponibles (buscar_propiedades, agendar_visita, etc.)
3. Gemini puede:
   - Responder con texto directo (si la info esta en el knowledge base)
   - Llamar una tool (si necesita data en vivo)
   - Decidir derivar al asesor humano
4. Loop hasta que Gemini responda con texto final o se alcance el maximo de tool calls.

La derivacion se detecta por palabras clave en la respuesta del bot:
- "DERIVAR_HUMANO" → marcar conversacion para asignar a vendedor
- "ESPERAR_HUMANO" → caso complejo, no derivar automaticamente
"""
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
import json

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User, UserRole
from models.whatsapp import (
    WhatsappConversation,
    WhatsappMessage,
    WaConversacionEstado,
    WaMensajeDireccion,
)
from models.bot_config import BotConfig, BotFaq
from services.gemini import generate_with_tools
from services.whatsapp_tools import TOOL_DECLARATIONS, execute_tool


# ---------- Carga del knowledge base ----------

_KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"
_KNOWLEDGE_CACHE: Optional[str] = None


def _read_raw_templates() -> str:
    """Lee los .md crudos (con placeholders sin renderizar)."""
    if not _KNOWLEDGE_DIR.exists():
        return ""
    pieces: List[str] = []
    for md in sorted(_KNOWLEDGE_DIR.glob("beyker_*.md")):
        try:
            pieces.append(f"\n\n### {md.stem} ###\n\n{md.read_text(encoding='utf-8')}")
        except Exception as e:
            print(f"[whatsapp_bot] error leyendo {md}: {e}")
    return "\n".join(pieces)


async def _render_knowledge(db: AsyncSession) -> str:
    """Renderiza el knowledge base reemplazando placeholders con valores de bot_config
    + appendea las FAQ activas y los textos extra del usuario."""
    global _KNOWLEDGE_CACHE
    if _KNOWLEDGE_CACHE is not None:
        return _KNOWLEDGE_CACHE

    template = _read_raw_templates()

    # Cargar config y faqs de DB
    r = await db.execute(select(BotConfig).where(BotConfig.id == 1))
    cfg = r.scalar_one_or_none()
    placeholders: Dict[str, str] = {}
    extras: List[str] = []
    if cfg:
        for field, val in cfg.__dict__.items():
            if field.startswith("_") or field in ("id", "updated_at"):
                continue
            placeholders[field] = val if val else "[sin definir]"
        # Textos extra que se appendean
        if cfg.identidad_extra:
            extras.append(f"\n\n### NOTAS EXTRA DE IDENTIDAD ###\n\n{cfg.identidad_extra}")
        if cfg.diferencial_extra:
            extras.append(f"\n\n### DIFERENCIAL EXTRA ###\n\n{cfg.diferencial_extra}")
        if cfg.tono_extra:
            extras.append(f"\n\n### TONO EXTRA ###\n\n{cfg.tono_extra}")
        if cfg.mensaje_bienvenida:
            extras.append(f"\n\n### MENSAJE DE BIENVENIDA ###\n\nCuando saludas por primera vez, usa este mensaje (o uno similar): \"{cfg.mensaje_bienvenida}\"")
        if cfg.mensaje_off_hours:
            extras.append(f"\n\n### MENSAJE FUERA DE HORARIO ###\n\nSi es fuera de horario laboral: \"{cfg.mensaje_off_hours}\"")
        if cfg.palabras_derivacion_extra:
            extras.append(f"\n\n### PALABRAS QUE DISPARAN DERIVACION INMEDIATA (ademas de las default) ###\n\n{cfg.palabras_derivacion_extra}")

    # Reemplazar placeholders {campo} en el template
    try:
        rendered = template.format(**placeholders) if placeholders else template
    except KeyError as e:
        # Si hay placeholder no soportado, dejamos el template como esta
        print(f"[whatsapp_bot] placeholder no encontrado: {e}")
        rendered = template

    # FAQs activas
    faqs_r = await db.execute(
        select(BotFaq).where(BotFaq.activo == True).order_by(BotFaq.orden, BotFaq.id)  # noqa: E712
    )
    faqs = faqs_r.scalars().all()
    if faqs:
        faq_text = "\n\n### FAQ EDITABLE DESDE LA APP ###\n\n"
        for f in faqs:
            faq_text += f"**P:** {f.pregunta}\n**R:** {f.respuesta}\n\n"
        rendered += faq_text

    rendered += "".join(extras)

    _KNOWLEDGE_CACHE = rendered
    return rendered


# ---------- System prompt ----------

async def _build_system_instruction(db: AsyncSession) -> str:
    knowledge = await _render_knowledge(db)
    return f"""Sos el asistente conversacional oficial de Coldwell Banker Beyker, una inmobiliaria de Buenos Aires.

ROL Y LIMITES:
- Atendes consultas de clientes por WhatsApp.
- Tu misión es: (1) responder con info correcta de Beyker, (2) calificar leads nuevos, (3) derivar al asesor humano cuando corresponda.
- NO sos un humano. Si te preguntan, decí que sos el asistente automático de la oficina y que podes conectar con un asesor.

REGLA DE ORO ANTI-ALUCINACION:
Si te preguntan algo especifico (precio de una propiedad, direccion, comision aplicada a un caso concreto, disponibilidad) y NO encontras la respuesta en la BASE DE CONOCIMIENTO de abajo o en alguna de las TOOLS disponibles → NO INVENTES. Decí: "Esa info te la confirma un asesor en un ratito" y al final agregá la palabra DERIVAR_HUMANO en una linea aparte.

CUANDO USAR TOOLS:
- "buscar_propiedades": cuando el cliente pregunta por propiedades disponibles, opciones en una zona, busqueda con filtros. NUNCA inventes propiedades — siempre llamá esta tool.
- "consultar_propiedad": cuando preguntan por una propiedad por ID o ya se le mostro una concreta.
- "agentes_disponibles_ahora": antes de derivar, para saber si hay alguien online.
- "agendar_visita_tentativa": cuando el cliente acepta ver una propiedad en una fecha/hora puntual.

CUANDO DERIVAR (agregá DERIVAR_HUMANO al final de tu respuesta):
- Si pediste 3-4 datos basicos del cliente (operacion, zona, presupuesto, ambientes) y los tenes → derivar.
- Si el cliente lo pide explicitamente ("quiero hablar con alguien", "pasame con un asesor").
- Si la consulta excede tu rol (queja, problema legal complejo, negociacion de reserva).
- Si despues de 5-6 mensajes la cosa no avanza → derivar.

CUANDO NO DERIVAR:
- Si la pregunta tiene respuesta clara en la base de conocimiento (horarios, direccion, comisiones, proceso, FAQ).
- Si esta saludando o haciendo small talk inicial.

FORMATO DE RESPUESTA:
- Mensajes cortos (1-3 lineas).
- Tuteo argentino, sin emojis, sin formalidad.
- Si vas a derivar, mencionalo de forma natural y agregá DERIVAR_HUMANO en una linea aparte al final, sin texto adicional.

BASE DE CONOCIMIENTO DE BEYKER (esta es la fuente de verdad, usala SIEMPRE antes de inventar):
{knowledge}

--- FIN DEL CONTEXTO ---

Ahora respondé al mensaje del cliente siguiendo todas las reglas de arriba.
"""


# ---------- Conversion historial → formato Gemini ----------

def _historial_a_contents(mensajes: List[WhatsappMessage], nuevo: WhatsappMessage) -> List[Dict[str, Any]]:
    """Convierte el historial de WhatsappMessage a formato Gemini contents."""
    contents: List[Dict[str, Any]] = []
    for m in mensajes:
        role = "user" if m.direccion == WaMensajeDireccion.inbound else "model"
        contents.append({"role": role, "parts": [{"text": m.contenido}]})
    contents.append({"role": "user", "parts": [{"text": nuevo.contenido}]})
    return contents


# ---------- Loop principal ----------

MAX_TOOL_CALLS = 4


async def procesar_mensaje_entrante(
    db: AsyncSession,
    conversation: WhatsappConversation,
    nuevo_mensaje: WhatsappMessage,
) -> Tuple[Optional[str], str]:
    """
    Procesa un mensaje entrante. Loop con tool calling hasta respuesta final.

    Devuelve (texto_respuesta_bot, accion).
    accion in {'continuar', 'derivar', 'esperar_humano'}
    """
    # Cargar historial
    r = await db.execute(
        select(WhatsappMessage)
        .where(
            and_(
                WhatsappMessage.conversation_id == conversation.id,
                WhatsappMessage.id != nuevo_mensaje.id,
            )
        )
        .order_by(WhatsappMessage.enviado_at.asc())
        .limit(30)
    )
    historial = r.scalars().all()

    contents = _historial_a_contents(historial, nuevo_mensaje)
    system_instruction = await _build_system_instruction(db)

    # Loop tool calling
    for _ in range(MAX_TOOL_CALLS):
        part = await generate_with_tools(
            contents=contents,
            tools=TOOL_DECLARATIONS,
            system_instruction=system_instruction,
            max_tokens=1500,
        )
        if not part:
            return ("Disculpame, tuve un problema. En un ratito te escribe un asesor.", "esperar_humano")

        # Caso 1: Gemini devuelve texto → fin del loop
        if "text" in part and part["text"]:
            text = part["text"].strip()
            # Detectar marcador de derivacion
            if "DERIVAR_HUMANO" in text:
                clean = text.replace("DERIVAR_HUMANO", "").strip()
                return (clean or None, "derivar")
            if "ESPERAR_HUMANO" in text:
                clean = text.replace("ESPERAR_HUMANO", "").strip()
                return (clean or None, "esperar_humano")
            return (text, "continuar")

        # Caso 2: Gemini quiere llamar una tool
        if "functionCall" in part:
            fc = part["functionCall"]
            name = fc.get("name", "")
            args = fc.get("args", {}) or {}
            print(f"[bot] tool call: {name}({args})")
            try:
                result = await execute_tool(db, name, args)
            except Exception as e:
                result = {"error": str(e)}

            # Agregar al historial: la function call del model + la response
            contents.append({"role": "model", "parts": [{"functionCall": fc}]})
            contents.append({
                "role": "user",
                "parts": [{
                    "functionResponse": {
                        "name": name,
                        "response": {"result": result},
                    }
                }],
            })
            continue

        # Sin text ni functionCall → caer en fallback
        return ("Disculpame, no entendi bien. Un asesor te escribe en un rato.", "esperar_humano")

    # Si llegamos al cap de tool calls sin texto final
    return ("Te paso con un asesor para que te ayude.", "derivar")


async def asignar_round_robin(db: AsyncSession) -> Optional[User]:
    """Encuentra el proximo vendedor disponible (less recently assigned first)."""
    r = await db.execute(
        select(User)
        .where(
            and_(
                User.role == UserRole.vendedor,
                User.is_active == True,  # noqa: E712
                User.is_available == True,  # noqa: E712
            )
        )
        .order_by(User.last_assigned_at.asc().nulls_first())
        .limit(1)
    )
    return r.scalar_one_or_none()


async def derivar_a_humano(
    db: AsyncSession,
    conversation: WhatsappConversation,
) -> Optional[User]:
    """Asigna la conv al proximo vendedor disponible y actualiza last_assigned_at."""
    agente = await asignar_round_robin(db)
    if not agente:
        return None

    conversation.assignee_id = agente.id
    conversation.estado = WaConversacionEstado.abierta
    agente.last_assigned_at = datetime.utcnow()
    await db.flush()
    return agente
