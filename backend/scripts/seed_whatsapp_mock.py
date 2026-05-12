"""Seed mock para Inbox WhatsApp (Fase 1, sin Meta real).

Genera 10-12 conversaciones de ejemplo con mensajes inbound + outbound
para que la pantalla /inbox tenga data en la demo. No toca otros modulos.
"""
import sys
import os
import asyncio
import random
from datetime import datetime, timedelta

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, delete
from core.database import AsyncSessionLocal
import models  # noqa: F401
from models.user import User, UserRole
from models.cliente import Cliente
from models.whatsapp import (
    WhatsappConversation, WhatsappMessage, WaConversacionEstado, WaMensajeDireccion,
)


CONVERSACIONES_MOCK = [
    {
        "telefono": "+5491155551001",
        "nombre_contacto": "Pablo Sanchez",
        "match_cliente_email": "pablo.sanchez0@demo.local",  # vincula si existe
        "estado": "abierta",
        "mensajes": [
            ("in",  "Hola! Vi en ZonaProp el depto de Palermo de USD 145k, sigue disponible?", -60),
            ("out", "Hola Pablo! Si, sigue disponible. Te paso fotos extra por aca.", -55),
            ("in",  "Genial, lo veria. Tienen visita esta semana?", -50),
            ("out", "Tenemos miercoles 18hs o sabado 11hs. Que te queda mejor?", -47),
            ("in",  "Sabado 11 perfecto", -10),
        ],
    },
    {
        "telefono": "+5491155551002",
        "nombre_contacto": "Mariana Diaz",
        "match_cliente_email": None,
        "estado": "abierta",
        "mensajes": [
            ("in",  "Buen dia, busco depto en Belgrano 2 amb hasta 150k USD", -180),
            ("out", "Hola Mariana! Te paso 3 opciones que matchean. Las queres ver el viernes?", -175),
            ("in",  "Viernes me complica, sabado a la manana puedo", -100),
            ("out", "Listo, sabado 10am te paso direcciones. Pasame email para enviarte fichas tecnicas?", -95),
            ("in",  "mariana.diaz@email.com", -90),
        ],
    },
    {
        "telefono": "+5491155551003",
        "nombre_contacto": None,
        "match_cliente_email": None,
        "estado": "nueva",
        "mensajes": [
            ("in", "Hola estoy interesado en alquilar un depto, tienen?", -3),
        ],
    },
    {
        "telefono": "+5491155551004",
        "nombre_contacto": "Carlos Romero",
        "match_cliente_email": None,
        "estado": "nueva",
        "mensajes": [
            ("in",  "Buen dia! Quiero tasar mi depto en Recoleta", -25),
            ("in",  "Soy el propietario. Tengo 3 amb 90m2.", -22),
            ("in",  "Cuanto tarda una tasacion?", -20),
        ],
    },
    {
        "telefono": "+5491155551005",
        "nombre_contacto": "Familia Gonzalez",
        "match_cliente_email": None,
        "estado": "abierta",
        "mensajes": [
            ("in",  "Hola venimos buscando una casa con jardin en Caballito", -1440),
            ("out", "Hola! Que metros y presupuesto manejan?", -1430),
            ("in",  "Hasta 250k USD, 3 dormitorios", -1420),
            ("out", "Tengo 2 opciones para mostrarles. La semana que viene les coordino.", -1410),
        ],
    },
    {
        "telefono": "+5491155551006",
        "nombre_contacto": "Lucia Fernandez",
        "match_cliente_email": None,
        "estado": "cerrada",
        "mensajes": [
            ("in",  "Hola, fui a la visita el sabado. Quiero hacer una oferta", -2880),
            ("out", "Hola Lucia! Pasame el monto, lo presento al propietario.", -2870),
            ("in",  "USD 175k", -2860),
            ("out", "Listo, te confirmo en 24-48hs.", -2850),
            ("out", "Acepto el propietario, te paso boleto de reserva por mail.", -2700),
            ("in",  "Genial, gracias!!", -2690),
        ],
    },
    {
        "telefono": "+5491155551007",
        "nombre_contacto": None,
        "match_cliente_email": None,
        "estado": "nueva",
        "mensajes": [
            ("in", "Hola quiero ver el monoambiente de villa crespo de 95mil", -8),
        ],
    },
    {
        "telefono": "+5491155551008",
        "nombre_contacto": "Federico Martinez",
        "match_cliente_email": None,
        "estado": "abierta",
        "mensajes": [
            ("in",  "Hola Lautaro, tengo el depto listo para escriturar la semana que viene", -600),
            ("out", "Excelente Federico! Te confirmo escribano y fecha mañana.", -580),
        ],
    },
    {
        "telefono": "+5491155551009",
        "nombre_contacto": None,
        "match_cliente_email": None,
        "estado": "bloqueada",
        "mensajes": [
            ("in", "INVERTI Y GANA U$D EN BITCOIN", -10000),
            ("in", "TE OFREZCO PRESTAMOS RAPIDOS", -9000),
        ],
    },
    {
        "telefono": "+5491155551010",
        "nombre_contacto": "Sofia Lopez",
        "match_cliente_email": None,
        "estado": "abierta",
        "mensajes": [
            ("in",  "Hola busco PH 3 amb con patio en Almagro", -300),
            ("out", "Hola Sofia! Tenemos uno nuevo justo, te paso fotos.", -290),
            ("in",  "Esta hermoso, pero esta sobre avenida?", -280),
            ("out", "Esta sobre calle interna tranquila, te paso ubicacion exacta.", -270),
        ],
    },
    {
        "telefono": "+5491155551011",
        "nombre_contacto": "Andres Beltran",
        "match_cliente_email": None,
        "estado": "abierta",
        "mensajes": [
            ("in",  "Hola, vi el aviso del semipiso de Nuñez", -45),
            ("in",  "Estan en periodo de reserva o lo puedo ofertar?", -43),
        ],
    },
    {
        "telefono": "+5491155551012",
        "nombre_contacto": "Valentina Cruz",
        "match_cliente_email": None,
        "estado": "nueva",
        "mensajes": [
            ("in", "Buenas! Como va? Soy Valentina, me recomendaron con uds para vender mi PH", -2),
        ],
    },
]


async def main():
    async with AsyncSessionLocal() as db:
        # Limpia conversaciones previas
        await db.execute(delete(WhatsappMessage))
        await db.execute(delete(WhatsappConversation))
        await db.commit()

        # Cargar vendedores para asignar
        vend_r = await db.execute(select(User).where(User.role == UserRole.vendedor))
        vendedores = vend_r.scalars().all()
        if not vendedores:
            print("No hay vendedores en la BD. Corre seed_demo.py primero.")
            return

        now = datetime.utcnow()
        for i, conv_data in enumerate(CONVERSACIONES_MOCK):
            # Vincular cliente si match
            cliente_id = None
            if conv_data["match_cliente_email"]:
                cli_r = await db.execute(select(Cliente).where(Cliente.email == conv_data["match_cliente_email"]))
                cli = cli_r.scalar_one_or_none()
                cliente_id = cli.id if cli else None

            # Asignar segun estado
            assignee = random.choice(vendedores) if conv_data["estado"] in ("abierta", "cerrada") else None
            unread = sum(1 for d, _, _ in conv_data["mensajes"] if d == "in") if conv_data["estado"] == "nueva" else 0

            # Calcular ultima actividad
            last_min = max(m[2] for m in conv_data["mensajes"])
            ultima_actividad = now + timedelta(minutes=last_min)

            conv = WhatsappConversation(
                telefono=conv_data["telefono"],
                nombre_contacto=conv_data["nombre_contacto"],
                cliente_id=cliente_id,
                assignee_id=assignee.id if assignee else None,
                estado=WaConversacionEstado(conv_data["estado"]),
                ultima_actividad=ultima_actividad,
                unread_count=unread,
            )
            db.add(conv)
            await db.flush()

            for direccion, contenido, minutos_offset in conv_data["mensajes"]:
                msg = WhatsappMessage(
                    conversation_id=conv.id,
                    direccion=WaMensajeDireccion(direccion),
                    sender_id=assignee.id if direccion == "out" and assignee else None,
                    contenido=contenido,
                    enviado_at=now + timedelta(minutes=minutos_offset),
                    leido=(direccion == "out" or conv_data["estado"] != "nueva"),
                    meta_message_id=f"mock_{conv.id}_{abs(minutos_offset)}",
                )
                db.add(msg)

        await db.commit()
        print(f"OK: {len(CONVERSACIONES_MOCK)} conversaciones mock creadas.")


if __name__ == "__main__":
    asyncio.run(main())
