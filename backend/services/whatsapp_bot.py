"""Bot conversacional para WhatsApp.

Estrategia:
- Cuando entra un mensaje nuevo de un contacto que NO tiene vendedor asignado,
  el bot toma el control y conversa con el cliente para calificar el lead.
- Despues de N intercambios o cuando detecta intencion de "quiero hablar con
  un asesor" o cuando ya tiene zona + presupuesto + ambientes basicos, deriva
  a un agente humano via round-robin de los disponibles.
- Si NADIE esta disponible: el bot se despide diciendo que un asesor le va a
  escribir en breve, y la conversacion queda en cola para asignar al proximo
  que se ponga disponible (o el coordinador la despacha manualmente).

El bot llama a Gemini con un system prompt + el historial de la conversacion.
Cuando Gemini decide derivar, devuelve un JSON especial que el handler interpreta.
"""
from typing import List, Optional, Tuple
from datetime import datetime
import json
import asyncio

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User, UserRole
from models.cliente import Cliente
from models.whatsapp import (
    WhatsappConversation,
    WhatsappMessage,
    WaConversacionEstado,
    WaMensajeDireccion,
)
from services.gemini import _generate


BOT_SYSTEM_PROMPT = """Sos el asistente conversacional de Coldwell Banker Beyker, una inmobiliaria de Buenos Aires, Argentina. Atendes consultas de clientes por WhatsApp en horario fuera de oficina o como primer contacto.

Tu objetivo es:
1. Saludar de forma profesional y calida (NO formal ni robotico).
2. Calificar al cliente con preguntas naturales (no como un formulario):
   - Si busca COMPRAR, ALQUILAR o VENDER/PUBLICAR su propiedad
   - Zona o barrio de interes
   - Presupuesto aproximado
   - Cantidad de ambientes (si es compra/alquiler)
3. Cuando tengas esos 3-4 datos basicos, derivar al cliente a un asesor humano.
4. Si el cliente pide explicitamente hablar con alguien, derivar inmediatamente.
5. Si el cliente solo dice "hola" o algo ambiguo, preguntar amablemente en que lo podes ayudar.
6. NUNCA inventes propiedades, precios o disponibilidad concretas. Si te preguntan algo especifico, decir que un asesor le va a confirmar.

Tono: argentino, cercano pero profesional. Usa "vos", "che", "dale". NO uses emojis. Mensajes cortos (1-3 lineas max). Sin formalidad excesiva.

Formato de respuesta:
SIEMPRE respondes en JSON con esta forma:
{
  "respuesta": "el texto que le mando al cliente",
  "accion": "continuar" | "derivar" | "esperar_humano",
  "datos_capturados": {
    "operacion": "compra" | "alquiler" | "venta" | null,
    "zona": "string o null",
    "presupuesto": "string o null",
    "ambientes": "numero o null",
    "nombre": "string o null"
  }
}

- "continuar" = seguis calificando (te falta info).
- "derivar" = ya tenes lo suficiente o el cliente pidio hablar con humano. La respuesta debe avisar al cliente que en breve le escribe un asesor.
- "esperar_humano" = caso especial, el cliente quiere algo que vos no podes resolver (negociacion compleja, queja). Respuesta breve diciendo que un asesor le contesta.
"""


async def procesar_mensaje_entrante(
    db: AsyncSession,
    conversation: WhatsappConversation,
    nuevo_mensaje: WhatsappMessage,
) -> Tuple[Optional[str], str]:
    """
    Procesa un mensaje entrante en una conversacion sin asignar.
    Devuelve (texto_respuesta_bot, accion).

    accion in {'continuar', 'derivar', 'esperar_humano'}
    """
    # Cargar historial de mensajes
    r = await db.execute(
        select(WhatsappMessage)
        .where(WhatsappMessage.conversation_id == conversation.id)
        .order_by(WhatsappMessage.enviado_at.asc())
        .limit(20)
    )
    mensajes = r.scalars().all()

    historial = []
    for m in mensajes:
        rol = "user" if m.direccion == WaMensajeDireccion.inbound else "model"
        historial.append(f"[{rol}] {m.contenido}")
    historial_str = "\n".join(historial)

    prompt = (
        f"{BOT_SYSTEM_PROMPT}\n\n"
        f"--- HISTORIAL DE LA CONVERSACION ---\n{historial_str}\n"
        f"--- NUEVO MENSAJE DEL CLIENTE ---\n{nuevo_mensaje.contenido}\n\n"
        f"Respondé SOLO con el JSON. NO escribas nada antes ni despues del JSON."
    )

    data = await _generate(prompt, json_mode=True, max_tokens=500)
    if not data:
        return ("Disculpame, tuve un problema. En breve te escribe un asesor.", "esperar_humano")

    respuesta = data.get("respuesta", "Un asesor te va a contestar en breve.")
    accion = data.get("accion", "esperar_humano")
    datos = data.get("datos_capturados") or {}

    # Si capturo nombre y la conv no lo tiene, actualizar
    if datos.get("nombre") and not conversation.nombre_contacto:
        conversation.nombre_contacto = datos["nombre"]

    # Si capturo zona/presupuesto/ambientes y hay cliente vinculado, podemos actualizar preferencias
    # (futuro: enriquecer Cliente con estos datos)

    return (respuesta, accion)


async def asignar_round_robin(db: AsyncSession) -> Optional[User]:
    """
    Encuentra el proximo vendedor disponible para asignarle una conversacion.
    Round-robin segun last_assigned_at (los menos recientes primero).

    Devuelve None si no hay nadie disponible.
    """
    r = await db.execute(
        select(User)
        .where(
            and_(
                User.role == UserRole.vendedor,
                User.is_active == True,  # noqa: E712
                User.is_available == True,  # noqa: E712
            )
        )
        .order_by(
            # Los que nunca se les asigno (NULL last) van primero
            User.last_assigned_at.asc().nulls_first(),
        )
        .limit(1)
    )
    return r.scalar_one_or_none()


async def derivar_a_humano(
    db: AsyncSession,
    conversation: WhatsappConversation,
) -> Optional[User]:
    """
    Asigna la conversacion al proximo vendedor disponible y actualiza last_assigned_at.
    Devuelve el vendedor asignado o None si nadie esta disponible.
    """
    agente = await asignar_round_robin(db)
    if not agente:
        return None

    conversation.assignee_id = agente.id
    conversation.estado = WaConversacionEstado.abierta
    agente.last_assigned_at = datetime.utcnow()
    await db.flush()
    return agente
