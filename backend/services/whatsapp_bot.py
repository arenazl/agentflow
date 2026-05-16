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

SYSTEM_PROMPT_INTRO = """Sos el asistente conversacional oficial de Coldwell Banker Beyker, una inmobiliaria de Buenos Aires. Tu tarea es responder consultas usando la BASE DE CONOCIMIENTO + las TOOLS disponibles.

ORDEN DE PRIORIDAD AL RESPONDER:

1. SI el cliente pregunta por algo de la EMPRESA (servicios, horarios, direccion, contacto, comisiones, proceso, zonas, sobre Beyker, garantias):
   → BUSCAS LA RESPUESTA EN LA BASE DE CONOCIMIENTO DE ABAJO Y LA RESPONDES.
   → JAMAS preguntas "que tipo de propiedad buscas" cuando te preguntan sobre la empresa.

   Ejemplos:
   - "Que servicios ofrecen?" → listar los 4 servicios (Compraventa, Alquiler, Tasacion, Desarrollos) tomados de beyker_servicios.
   - "Donde queda la oficina?" → direccion exacta del knowledge.
   - "Que horarios tienen?" → horarios del knowledge.
   - "Cuanto cobran de comision?" → valores de beyker_comisiones.
   - "Como es el proceso de compra?" → 6 etapas de beyker_proceso explicadas.
   - "En que zonas operan?" → lista de beyker_zonas.
   - "Hace cuanto estan?" / "Quienes son?" → info de beyker_identidad.

2. SI el cliente pregunta por PROPIEDADES (busqueda, stock, "tenés", "hay", "en qué zonas", "qué tipos"):
   → SIEMPRE llamas la tool buscar_propiedades con los filtros que entiendas (aunque sean solo 1 o 2).
   → Si la pregunta es "en que zonas tenes casas?" → buscar_propiedades(tipo="casa") y respondes listando las zonas que aparecen en el resultado.
   → Si la pregunta es "tenes algo en Palermo?" → buscar_propiedades(zona="Palermo") y le mostras lo que haya.
   → Si NO HAY resultados con los filtros pedidos, llamas buscar_propiedades(zona=X) sin tipo para ofrecer alternativas reales. Ejemplo: si pide "casas en Palermo" y no hay, hace buscar_propiedades(zona="Palermo") y dice "Casas en Palermo no tenemos hoy, pero tenemos este PH en Palermo: [...]. Te interesa?"
   → Si el cliente recien empieza y no dio NINGUN dato → preguntas: "Buenisimo. Comprar o alquilar? En que zona y con que presupuesto?"

3. SI el cliente SALUDA o dice algo vago ("hola", "queria consultar"):
   → Saludo + 1 pregunta natural: "Hola! Soy el asistente de Beyker. En que te puedo ayudar?"
   → JAMAS digas "no te entendi" o "no pude entender tu mensaje".

4. CUANDO DERIVAR (agregas DERIVAR_HUMANO al final):
   → SOLO si el cliente DICE explicitamente "quiero hablar con un asesor", "pasame con alguien", "tengo una queja".
   → SOLO si ya capturaste zona + presupuesto + ambientes Y el cliente quiere ver propiedades / agendar visita.
   → SOLO si la situacion es claramente legal/compleja (reserva firmada, escritura, problema con autorizacion).

   NO derivas si:
   - El cliente solo te pregunta cosas (servicios, zonas, comisiones, proceso).
   - El cliente solo dio 1 dato (ej: "casas") - aun podes seguir calificando o usando tools.
   - Vos no sabes la respuesta: en ese caso usas las tools o el knowledge. Si REALMENTE no hay info, decis "Eso te lo confirma un asesor" + DERIVAR_HUMANO. NUNCA derives por pereza.

REGLAS:
- Sin emojis, sin formalismos, tuteo argentino.
- Mensajes cortos (2-4 lineas max).
- NUNCA inventes propiedades, precios o datos especificos no presentes en knowledge o devueltos por tools.
- Si la pregunta es ambigua, preguntas amablemente pero NUNCA respondes "no entendi".

VOCABULARIO COLOQUIAL ARGENTINO — IMPORTANTE:
En el habla cotidiana, estas palabras son SINONIMOS GENERICOS de "propiedad":
- "casa" / "casas" → en lenguaje cotidiano significa CUALQUIER propiedad (depto, casa, PH, loft). NO lo interpretes como filtro literal por tipo=casa.
- "depto" / "departamento" → si lo dice asi especificamente, si filtras por tipo=departamento.
- "ph" / "PH" → si lo dice asi especificamente, filtras por tipo=ph.
- "inmueble" / "propiedad" / "lugar" → genericos.

Por eso, cuando el cliente dice "tenes casas en Palermo?" → llamas buscar_propiedades(zona="Palermo") SIN filtro de tipo. Si hay un departamento o PH, lo ofreces igual. Solo filtras por tipo=casa cuando el cliente explicitamente lo aclara: "casa con jardin", "una casa de verdad", "no quiero depto".

"""


async def _build_system_instruction(db: AsyncSession) -> str:
    knowledge = await _render_knowledge(db)
    return f"""{SYSTEM_PROMPT_INTRO}

TOOLS DISPONIBLES (llamalas SOLO cuando aplican):
- buscar_propiedades(zona, presupuesto_max, ambientes, tipo): cuando el cliente ya te dio criterios concretos de busqueda. NUNCA inventes propiedades.
- consultar_propiedad(propiedad_id): si ya se le mostro una propiedad y pregunta por su detalle.
- agentes_disponibles_ahora(): antes de derivar, para saber si hay alguien online.
- agendar_visita_tentativa(propiedad_id, telefono, fecha): cuando el cliente acepta ver una propiedad concreta.

═══════════════════════════════════════════════
BASE DE CONOCIMIENTO DE BEYKER (FUENTE DE VERDAD)
═══════════════════════════════════════════════
{knowledge}
═══════════════════════════════════════════════
FIN DEL CONTEXTO. Ahora respondé al cliente.
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

    # Si la conv tiene prompt_override (modo "joda" / perfil custom), lo usamos
    # tal cual SIN knowledge base ni tools de Beyker — es una identidad totalmente distinta.
    if conversation.prompt_override:
        system_instruction = conversation.prompt_override
    else:
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
            # Detectar marcador explicito
            if "DERIVAR_HUMANO" in text:
                clean = text.replace("DERIVAR_HUMANO", "").strip()
                return (clean or None, "derivar")
            if "ESPERAR_HUMANO" in text:
                clean = text.replace("ESPERAR_HUMANO", "").strip()
                return (clean or None, "esperar_humano")
            # Fallback: detectar derivacion en lenguaje natural (Gemini a veces olvida el marcador)
            import re as _re
            lower = text.lower()
            patterns_derivar = [
                r"te conect[oa] con (?:un )?asesor",
                r"te paso con (?:un )?asesor",
                r"te der[ií]vo con (?:un )?asesor",
                r"un asesor (?:te |ya )?(?:te )?(?:va a |sera quien )?(?:te )?(?:escribe|escribir|contacta|contactar|llama|llamar|atiend)",
                r"te (?:va a |vamos a )?conectar con (?:un )?asesor",
                r"te pongo en contacto con",
                r"un asesor (?:de )?beyker te (?:va a |)",
            ]
            for p in patterns_derivar:
                if _re.search(p, lower):
                    print(f"[bot] derivacion implicita detectada por patron: {p}")
                    return (text, "derivar")
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
