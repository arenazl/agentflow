"""
Seed con datos DEMO para visualizar la app.

IMPORTANTE: Todos los datos son ficticios pero realistas:
  - Nombres de personas: ficticios (similar a Faker), no reales.
  - Direcciones: calles reales de Buenos Aires + numeros plausibles.
  - Coordenadas: centro aproximado de cada barrio + pequena variacion (~100m).
  - Telefonos / emails: dominio @demo.local, NO usar para contacto real.
  - Precios: rango realista del mercado AR (2026) pero no son listings reales.

Correr: python scripts/seed_demo.py
"""
import sys
import os
import asyncio
import random
from datetime import datetime, date, time, timedelta

# Windows: aiomysql + SSL requiere SelectorEventLoop (ProactorEventLoop rompe SSL)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal, engine, Base
import models  # registra tablas  # noqa: F401
from models.user import User, UserRole
from models.cliente import Cliente, ClienteEstado, ClienteTemperatura, ClienteOrigen
from models.propiedad import Propiedad, FotoPropiedad, PropiedadEstado, PropiedadTipo
from models.autorizacion import Autorizacion, AutorizacionEstado
from models.visita import Visita, VisitaEstado, VisitaResultado
from models.pipeline import PipelineDeal, PipelineEtapa
from models.dmo import (
    Coach, DmoTemplate, DmoBloque, VendedorDmoAssignment, DmoLog, MetricaTipo,
)
from core.security import get_password_hash


# Coordenadas reales (centro aproximado) de barrios de CABA
BARRIOS = {
    "Palermo":      (-34.5870, -58.4310),
    "Belgrano":     (-34.5630, -58.4570),
    "Recoleta":     (-34.5870, -58.3940),
    "Caballito":    (-34.6190, -58.4400),
    "Nunez":        (-34.5460, -58.4630),
    "Villa Crespo": (-34.6000, -58.4380),
    "Almagro":      (-34.6100, -58.4200),
    "Colegiales":   (-34.5750, -58.4490),
    "San Telmo":    (-34.6210, -58.3720),
    "Chacarita":    (-34.5870, -58.4530),
}

CALLES = [
    "Av. Santa Fe", "Av. Cabildo", "Av. Las Heras", "Av. Corrientes",
    "Av. Rivadavia", "Av. Pueyrredon", "Av. Scalabrini Ortiz",
    "Thames", "Honduras", "El Salvador", "Costa Rica", "Guatemala",
    "Arenales", "French", "Pacheco de Melo", "Juncal", "Vidal",
    "Cuba", "Mendoza", "Olleros", "Charcas", "Paraguay",
]

NOMBRES = ["Lautaro", "Romina", "Federico", "Camila", "Martin", "Sofia", "Joaquin",
           "Valentina", "Ezequiel", "Lucia", "Tomas", "Agustina", "Nicolas", "Florencia",
           "Matias", "Julieta", "Bruno", "Catalina", "Diego", "Mariana"]

APELLIDOS = ["Perez", "Gomez", "Rodriguez", "Lopez", "Garcia", "Martinez", "Fernandez",
             "Diaz", "Sanchez", "Romero", "Torres", "Sosa", "Ruiz", "Alvarez",
             "Acosta", "Benitez", "Medina", "Suarez", "Castro", "Molina"]

TITULOS_PROP = {
    PropiedadTipo.departamento: [
        "Departamento 2 ambientes a estrenar",
        "Semipiso luminoso con balcon",
        "Monoambiente con amenities",
        "3 ambientes con dependencia",
        "PH reciclado en planta baja",
        "Loft estilo industrial",
    ],
    PropiedadTipo.casa: [
        "Casa con jardin y pileta",
        "Casa estilo americano 4 ambientes",
        "Chalet refaccionado",
    ],
    PropiedadTipo.ph: [
        "PH al frente con patio",
        "PH 3 ambientes con terraza propia",
    ],
}


def coord_aprox(barrio: str) -> tuple[float, float]:
    """Devuelve coord cerca del centro del barrio (~100m de variacion)."""
    base_lat, base_lng = BARRIOS[barrio]
    return (base_lat + random.uniform(-0.001, 0.001), base_lng + random.uniform(-0.001, 0.001))


async def reset_all(db: AsyncSession):
    """Borra todo antes de insertar."""
    for model in [
        DmoLog, VendedorDmoAssignment, DmoBloque, DmoTemplate, Coach,
        PipelineDeal, Visita, Autorizacion, FotoPropiedad, Propiedad, Cliente, User,
    ]:
        await db.execute(delete(model))
    await db.commit()


async def seed_users(db: AsyncSession) -> list[User]:
    print("Seed users...")
    pw = get_password_hash("admin123")

    users_data = [
        ("admin@beyker.demo", "Admin", "Sistema", UserRole.admin, 0, "+5491100000000"),
        ("gerente@beyker.demo", "Marcelo", "Beyker", UserRole.gerente, 0, "+5491111111111"),
        ("lautaro@beyker.demo", "Lautaro", "Perez", UserRole.vendedor, 20, "+5491122222222"),
        ("romina@beyker.demo", "Romina", "Gomez", UserRole.vendedor, 20, "+5491133333333"),
        ("federico@beyker.demo", "Federico", "Rodriguez", UserRole.vendedor, 18, "+5491144444444"),
        ("camila@beyker.demo", "Camila", "Lopez", UserRole.vendedor, 25, "+5491155555555"),
        ("martin@beyker.demo", "Martin", "Garcia", UserRole.vendedor, 15, "+5491166666666"),
    ]
    users = []
    for email, nombre, apellido, role, meta, tel in users_data:
        u = User(
            email=email,
            hashed_password=pw,
            nombre=nombre,
            apellido=apellido,
            telefono=tel,
            role=role,
            meta_conversaciones_diaria=meta or 20,
            is_active=True,
        )
        db.add(u)
        users.append(u)
    await db.commit()
    for u in users:
        await db.refresh(u)
    print(f"  {len(users)} usuarios creados. Password de todos: admin123")
    return users


# ---------- DMO: Coaches + Templates + Bloques ----------
# Templates basados en metodologias reconocidas del mercado.
# Fuentes: Tom Ferry (tomferry.com), Mike Ferry (mikeferry.com),
# Brian Buffini (buffiniandcompany.com), Workman Success (workmansuccess.com).
# El template "Beyker AR" es una adaptacion al mercado argentino donde
# el cold calling no funciona y WhatsApp es el canal dominante.

COACHES_TEMPLATES = [
    {
        "coach": {
            "nombre": "Beyker AR",
            "descripcion": (
                "DMO adaptado al mercado argentino. Reemplaza el cold calling "
                "(que no funciona en AR post-pandemia) por el WhatsApp Block como "
                "canal principal de conversacion. Combina prospeccion calida + presencia "
                "en calle/visitas + captacion activa."
            ),
            "fuente_url": None,
            "es_oficial": True,
        },
        "templates": [
            {
                "nombre": "DMO Argentina (Beyker)",
                "descripcion": "Rutina diaria adaptada al canal WhatsApp + presencia presencial.",
                "mercado": "AR",
                "es_default_inmobiliaria": True,
                "bloques": [
                    {
                        "nombre": "Apertura",
                        "descripcion": "Revisar nuevos listings en portales (ZonaProp, Argenprop, ML), leads de la noche, agenda del dia.",
                        "hora_inicio": time(8, 30), "hora_fin": time(9, 0),
                        "color": "#94a3b8", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                    {
                        "nombre": "WhatsApp Block",
                        "descripcion": "El bloque clave del dia. Responder leads, nutrir cartera, pop-ins por WhatsApp. Meta: 10-15 conversaciones reales.",
                        "hora_inicio": time(9, 0), "hora_fin": time(10, 30),
                        "color": "#25D366", "es_money_block": True,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Conversaciones", "metrica_meta": 12,
                    },
                    {
                        "nombre": "Captacion activa",
                        "descripcion": "Llamados a contactos calidos, pop-bys digitales, prospeccion a vencimientos de autorizacion de competencia.",
                        "hora_inicio": time(10, 30), "hora_fin": time(11, 30),
                        "color": "#f59e0b", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Contactos calidos", "metrica_meta": 5,
                    },
                    {
                        "nombre": "Calle / Visitas",
                        "descripcion": "Visitas a propiedades, tasaciones, cafe con referentes, captaciones presenciales. En AR la confianza presencial pesa.",
                        "hora_inicio": time(14, 0), "hora_fin": time(17, 0),
                        "color": "#22c55e", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Visitas/reuniones", "metrica_meta": 1,
                    },
                    {
                        "nombre": "Cierre",
                        "descripcion": "Cargar todo al CRM, agendar mañana, mandar follow-ups pendientes, actualizar pipeline.",
                        "hora_inicio": time(17, 30), "hora_fin": time(18, 30),
                        "color": "#3b82f6", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                ],
            },
        ],
    },
    {
        "coach": {
            "nombre": "Tom Ferry",
            "descripcion": (
                "Hijo y heredero de Mike Ferry, fundador de Tom Ferry International. "
                "Su metodologia 'Hour of Power' propone 60 minutos diarios de prospecting "
                "hasta lograr 6 conversaciones reales. Coach del top 1% de USA."
            ),
            "fuente_url": "https://www.tomferry.com/",
            "es_oficial": True,
        },
        "templates": [
            {
                "nombre": "Hour of Power (Tom Ferry)",
                "descripcion": "90-day challenge: 6 conversaciones reales diarias.",
                "mercado": "USA",
                "es_default_inmobiliaria": False,
                "bloques": [
                    {
                        "nombre": "Mindset Morning",
                        "descripcion": "Meditacion / journaling / lectura. Visualizar el dia.",
                        "hora_inicio": time(7, 0), "hora_fin": time(8, 0),
                        "color": "#a78bfa", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                    {
                        "nombre": "Hour of Power",
                        "descripcion": "60 minutos prospecting intenso. Meta: 6 conversaciones reales.",
                        "hora_inicio": time(8, 0), "hora_fin": time(9, 0),
                        "color": "#ef4444", "es_money_block": True,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Conversaciones reales", "metrica_meta": 6,
                    },
                    {
                        "nombre": "Lead Follow-Up",
                        "descripcion": "45 min seguimiento a leads activos del CRM. Cadencia: dia 1, dia 3, dia 7.",
                        "hora_inicio": time(9, 15), "hora_fin": time(10, 0),
                        "color": "#f59e0b", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Follow-ups", "metrica_meta": 10,
                    },
                    {
                        "nombre": "Geo-Farm",
                        "descripcion": "15 min de prospeccion en zona propia (puerta a puerta, vecinos, listings expirados).",
                        "hora_inicio": time(10, 0), "hora_fin": time(10, 15),
                        "color": "#10b981", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Contactos zona", "metrica_meta": 3,
                    },
                    {
                        "nombre": "Listing / Showing Time",
                        "descripcion": "Presentations, recorridas, open houses, reuniones con buyers/sellers.",
                        "hora_inicio": time(11, 0), "hora_fin": time(16, 0),
                        "color": "#22c55e", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Citas", "metrica_meta": 2,
                    },
                    {
                        "nombre": "Daily Wrap-Up",
                        "descripcion": "CRM update, agenda mañana, revisar metricas del dia.",
                        "hora_inicio": time(16, 30), "hora_fin": time(17, 0),
                        "color": "#3b82f6", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                ],
            },
        ],
    },
    {
        "coach": {
            "nombre": "Mike Ferry",
            "descripcion": (
                "Fundador en 1975 de The Mike Ferry Organization, pionero del coaching "
                "inmobiliario moderno. Su DMO clasico exige 3 horas diarias de prospecting "
                "ininterrumpido a la mañana, con scripts estructurados."
            ),
            "fuente_url": "https://www.mikeferry.com/",
            "es_oficial": True,
        },
        "templates": [
            {
                "nombre": "Classic Prospecting (Mike Ferry)",
                "descripcion": "3h de prospecting AM ininterrumpido. Old-school scripts.",
                "mercado": "USA",
                "es_default_inmobiliaria": False,
                "bloques": [
                    {
                        "nombre": "Morning Schedule",
                        "descripcion": "Levantarse 6 AM, ejercicio, revisar agenda del dia.",
                        "hora_inicio": time(6, 0), "hora_fin": time(8, 0),
                        "color": "#94a3b8", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                    {
                        "nombre": "Prospecting Block",
                        "descripcion": "3 horas seguidas de llamadas con scripts. Pomodoro: 25min on, 5min off. SIN interrupciones.",
                        "hora_inicio": time(8, 0), "hora_fin": time(11, 0),
                        "color": "#ef4444", "es_money_block": True,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Contactos", "metrica_meta": 20,
                    },
                    {
                        "nombre": "Lead Follow-up",
                        "descripcion": "Re-llamar leads, agendar appointments, scripts de objeciones.",
                        "hora_inicio": time(11, 0), "hora_fin": time(12, 0),
                        "color": "#f59e0b", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Appointments", "metrica_meta": 2,
                    },
                    {
                        "nombre": "Appointments / Showings",
                        "descripcion": "Listings presentations, buyer consultations, showings.",
                        "hora_inicio": time(13, 0), "hora_fin": time(17, 0),
                        "color": "#22c55e", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Citas", "metrica_meta": 2,
                    },
                    {
                        "nombre": "Admin / Wrap-up",
                        "descripcion": "Paperwork, CRM, agenda dia siguiente.",
                        "hora_inicio": time(17, 0), "hora_fin": time(18, 0),
                        "color": "#3b82f6", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                ],
            },
        ],
    },
    {
        "coach": {
            "nombre": "Brian Buffini",
            "descripcion": (
                "Fundador en 1996 de Buffini & Company. Su sistema 'Work by Referral' "
                "rechaza el cold calling y construye negocio sobre la esfera de influencia "
                "via calls + notes + pop-bys (visitas con regalo). Members ganan ~10x el promedio."
            ),
            "fuente_url": "https://www.buffiniandcompany.com/",
            "es_oficial": True,
        },
        "templates": [
            {
                "nombre": "Work by Referral (Buffini)",
                "descripcion": "Sphere-based. NO cold calling. Calls + Notes + Pop-Bys.",
                "mercado": "USA",
                "es_default_inmobiliaria": False,
                "bloques": [
                    {
                        "nombre": "Morning Routine",
                        "descripcion": "Devocional + planning. Repaso de la esfera del dia.",
                        "hora_inicio": time(7, 30), "hora_fin": time(8, 30),
                        "color": "#a78bfa", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                    {
                        "nombre": "Sphere Calls",
                        "descripcion": "Llamadas calidas a la esfera de influencia. NO scripts agresivos, charla genuina de seguimiento.",
                        "hora_inicio": time(9, 0), "hora_fin": time(10, 30),
                        "color": "#ef4444", "es_money_block": True,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Calls esfera", "metrica_meta": 5,
                    },
                    {
                        "nombre": "Personal Notes",
                        "descripcion": "Escribir 3-5 notas manuscritas: gracias, felicitaciones, recordatorios. Diferenciador #1 del sistema.",
                        "hora_inicio": time(10, 30), "hora_fin": time(11, 0),
                        "color": "#f59e0b", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Notas escritas", "metrica_meta": 5,
                    },
                    {
                        "nombre": "Pop-By Time",
                        "descripcion": "Visitas cortas a 2-3 contactos calidos con regalo de bajo costo (cafe, planta, alfajor). 5 min cada una.",
                        "hora_inicio": time(11, 0), "hora_fin": time(12, 30),
                        "color": "#10b981", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Pop-Bys", "metrica_meta": 3,
                    },
                    {
                        "nombre": "Lead Generation Activities",
                        "descripcion": "Trabajo con buyers/sellers actuales, showings, presentations.",
                        "hora_inicio": time(13, 30), "hora_fin": time(17, 0),
                        "color": "#22c55e", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                    {
                        "nombre": "CRM Update",
                        "descripcion": "Actualizar Referral Maker / CRM con cada interaccion de la esfera.",
                        "hora_inicio": time(17, 0), "hora_fin": time(17, 30),
                        "color": "#3b82f6", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                ],
            },
        ],
    },
    {
        "coach": {
            "nombre": "Verl Workman",
            "descripcion": (
                "Fundador de Workman Success Systems. Acuño el concepto 'Dollar Productive "
                "Activities' (DPA) y el principio 'anything you do 3 times, create a system'. "
                "Foco en time-blocking semanal y coaching de teams."
            ),
            "fuente_url": "https://workmansuccess.com/",
            "es_oficial": True,
        },
        "templates": [
            {
                "nombre": "Dollar Productive (Workman)",
                "descripcion": "Time-blocking enfocado en actividades que generan ingresos directos.",
                "mercado": "USA",
                "es_default_inmobiliaria": False,
                "bloques": [
                    {
                        "nombre": "Market Snapshot",
                        "descripcion": "Revisar MLS, listings nuevos en zona, precios moviendose.",
                        "hora_inicio": time(8, 0), "hora_fin": time(8, 45),
                        "color": "#94a3b8", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                    {
                        "nombre": "DPA: Dollar Productive",
                        "descripcion": "El bloque sagrado. Solo actividades que generan plata: lead gen, listing appts, contract negotiation.",
                        "hora_inicio": time(9, 0), "hora_fin": time(11, 0),
                        "color": "#ef4444", "es_money_block": True,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Contactos DPA", "metrica_meta": 15,
                    },
                    {
                        "nombre": "Skill Building",
                        "descripcion": "30-60 min training: scripts, role-play, lectura, podcast del rubro.",
                        "hora_inicio": time(11, 0), "hora_fin": time(11, 45),
                        "color": "#a78bfa", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                    {
                        "nombre": "Client Care",
                        "descripcion": "Reuniones con clientes activos, showings, presentations, negotiations.",
                        "hora_inicio": time(13, 0), "hora_fin": time(16, 30),
                        "color": "#22c55e", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.cantidad, "metrica_label": "Reuniones", "metrica_meta": 2,
                    },
                    {
                        "nombre": "Systems & Process",
                        "descripcion": "Trabajo sobre el negocio: mejorar checklists, automatizar, delegar.",
                        "hora_inicio": time(16, 30), "hora_fin": time(17, 30),
                        "color": "#3b82f6", "es_money_block": False,
                        "metrica_tipo": MetricaTipo.checkbox, "metrica_label": None, "metrica_meta": 0,
                    },
                ],
            },
        ],
    },
]


async def seed_dmo_metodologias(db: AsyncSession) -> tuple[list[Coach], list[DmoTemplate]]:
    print("Seed coaches + templates DMO (basado en investigacion)...")
    coaches: list[Coach] = []
    templates: list[DmoTemplate] = []

    for cdata in COACHES_TEMPLATES:
        c = Coach(**cdata["coach"])
        db.add(c)
        await db.flush()
        coaches.append(c)

        for tdata in cdata["templates"]:
            bloques_data = tdata.pop("bloques")
            t = DmoTemplate(
                coach_id=c.id,
                **tdata,
            )
            db.add(t)
            await db.flush()
            for idx, bd in enumerate(bloques_data):
                b = DmoBloque(
                    template_id=t.id,
                    orden=idx + 1,
                    **bd,
                )
                db.add(b)
            templates.append(t)

    await db.commit()
    for c in coaches:
        await db.refresh(c)
    for t in templates:
        await db.refresh(t)
    print(f"  {len(coaches)} coaches + {len(templates)} templates creados.")
    return coaches, templates


async def seed_dmo_assignments(db: AsyncSession, users: list[User], templates: list[DmoTemplate]):
    """Asigna a cada vendedor un template (la mayoria al default AR, algunos a otros coaches)."""
    print("Seed asignaciones DMO a vendedores...")
    vendedores = [u for u in users if u.role == UserRole.vendedor]
    default_tpl = next((t for t in templates if t.es_default_inmobiliaria), templates[0])
    otros = [t for t in templates if t.id != default_tpl.id]

    # 60% al default AR, 40% repartido entre los otros
    asignaciones = []
    for i, v in enumerate(vendedores):
        if i < int(len(vendedores) * 0.6) or not otros:
            tpl = default_tpl
        else:
            tpl = random.choice(otros)
        a = VendedorDmoAssignment(vendedor_id=v.id, template_id=tpl.id)
        db.add(a)
        asignaciones.append((v, tpl))
    await db.commit()
    for v, tpl in asignaciones:
        print(f"  {v.nombre} {v.apellido} -> {tpl.nombre}")
    return asignaciones


async def seed_propiedades(db: AsyncSession, users: list[User]) -> list[Propiedad]:
    print("Seed propiedades...")
    vendedores = [u for u in users if u.role == UserRole.vendedor]
    props = []
    tipos = list(TITULOS_PROP.keys())

    for i in range(20):
        tipo = random.choice(tipos)
        barrio = random.choice(list(BARRIOS.keys()))
        lat, lng = coord_aprox(barrio)
        amb = random.randint(1, 5)
        m2_t = random.randint(35, 200)
        m2_c = int(m2_t * random.uniform(0.7, 0.95))
        precio = random.choice([85000, 110000, 145000, 175000, 220000, 260000, 320000, 380000, 450000])
        captador = random.choice(vendedores)

        p = Propiedad(
            captador_id=captador.id,
            titulo=random.choice(TITULOS_PROP[tipo]),
            descripcion=f"Hermosa propiedad ubicada en {barrio}. Excelente luminosidad, "
                        f"servicios cercanos, transporte publico a metros. Lista para mudarse.",
            tipo=tipo,
            direccion=f"{random.choice(CALLES)} {random.randint(100, 5000)}",
            barrio=barrio,
            ciudad="Buenos Aires",
            lat=lat,
            lng=lng,
            m2_totales=m2_t,
            m2_cubiertos=m2_c,
            ambientes=amb,
            banos=max(1, amb // 2),
            cocheras=random.choice([0, 0, 1, 1, 2]),
            antiguedad=random.randint(0, 40),
            precio_publicacion=precio,
            moneda="USD",
            estado=random.choices(
                [PropiedadEstado.captada, PropiedadEstado.publicada, PropiedadEstado.reservada, PropiedadEstado.vendida],
                weights=[2, 6, 1, 1],
            )[0],
            exclusividad=random.choice([True, False]),
        )
        db.add(p)
        props.append(p)
    await db.commit()
    for p in props:
        await db.refresh(p)

    # Fotos (picsum placeholders, deterministicas por seed)
    print("  agregando fotos placeholder (picsum.photos)...")
    for p in props:
        for orden in range(random.randint(2, 5)):
            f = FotoPropiedad(
                propiedad_id=p.id,
                url=f"https://picsum.photos/seed/agentflow{p.id}-{orden}/800/600",
                orden=orden,
            )
            db.add(f)
    await db.commit()
    print(f"  {len(props)} propiedades creadas.")
    return props


async def seed_clientes(db: AsyncSession, users: list[User]) -> list[Cliente]:
    print("Seed clientes...")
    vendedores = [u for u in users if u.role == UserRole.vendedor]
    estados_w = [
        (ClienteEstado.nuevo, 5),
        (ClienteEstado.contactado, 8),
        (ClienteEstado.calificado, 6),
        (ClienteEstado.cita, 4),
        (ClienteEstado.propuesta, 2),
        (ClienteEstado.cerrado, 2),
        (ClienteEstado.perdido, 3),
    ]
    estados_list = [e for e, w in estados_w for _ in range(w)]
    temps = [ClienteTemperatura.caliente, ClienteTemperatura.tibio, ClienteTemperatura.frio, None]
    origenes = list(ClienteOrigen)

    clientes = []
    for i in range(35):
        v = random.choice(vendedores)
        nombre = random.choice(NOMBRES)
        apellido = random.choice(APELLIDOS)
        estado = random.choice(estados_list)
        presup_min = random.choice([80000, 100000, 150000, 200000])
        presup_max = presup_min + random.choice([50000, 100000, 150000])

        c = Cliente(
            vendedor_id=v.id,
            nombre=nombre,
            apellido=apellido,
            email=f"{nombre.lower()}.{apellido.lower()}{i}@demo.local",
            telefono=f"+54911{random.randint(10000000, 99999999)}",
            origen=random.choice(origenes),
            estado=estado,
            temperatura=random.choice(temps),
            pref_zona=random.choice(list(BARRIOS.keys())),
            pref_m2_min=random.choice([40, 50, 70, 90]),
            pref_m2_max=random.choice([80, 100, 150, 200]),
            pref_ambientes=random.choice([1, 2, 3, 4]),
            pref_presupuesto_min=presup_min,
            pref_presupuesto_max=presup_max,
            pref_moneda="USD",
            notas=f"Cliente {estado.value}. Busca en {random.choice(list(BARRIOS.keys()))}.",
            last_contact_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
        )
        db.add(c)
        clientes.append(c)
    await db.commit()
    for c in clientes:
        await db.refresh(c)
    print(f"  {len(clientes)} clientes creados.")
    return clientes


async def seed_autorizaciones(db: AsyncSession, props: list[Propiedad], users: list[User]):
    print("Seed autorizaciones...")
    auts = []
    for p in props[:15]:
        fecha_firma = date.today() - timedelta(days=random.randint(5, 120))
        fecha_venc = fecha_firma + timedelta(days=random.choice([90, 120, 180]))
        a = Autorizacion(
            propiedad_id=p.id,
            captador_id=p.captador_id,
            fecha_firma=fecha_firma,
            fecha_vencimiento=fecha_venc,
            precio_minimo=p.precio_publicacion * 0.92,
            moneda="USD",
            comision_pct=random.choice([3.0, 4.0, 5.0]),
            exclusividad=p.exclusividad,
            observaciones="Autorizacion firmada por el propietario.",
            estado=AutorizacionEstado.activa if fecha_venc >= date.today() else AutorizacionEstado.vencida,
        )
        db.add(a)
        auts.append(a)
    await db.commit()
    print(f"  {len(auts)} autorizaciones creadas.")


async def seed_visitas(db: AsyncSession, clientes: list[Cliente], props: list[Propiedad]):
    print("Seed visitas...")
    visitas = []
    for _ in range(45):
        c = random.choice(clientes)
        p = random.choice(props)
        delta_dias = random.randint(-30, 14)
        fecha = datetime.utcnow() + timedelta(days=delta_dias, hours=random.randint(9, 19))
        if delta_dias < 0:
            estado = random.choice([VisitaEstado.concretada, VisitaEstado.cancelada, VisitaEstado.ausente])
            resultado = random.choice(list(VisitaResultado))
            notas = (
                "Cliente intereso. Le gusto la zona y la luminosidad. "
                "Pidio info sobre expensas y impuestos."
            ) if estado == VisitaEstado.concretada else None
        else:
            estado = VisitaEstado.agendada
            resultado = VisitaResultado.sin_resultado
            notas = None
        v = Visita(
            cliente_id=c.id,
            propiedad_id=p.id,
            vendedor_id=c.vendedor_id,
            fecha_hora=fecha,
            estado=estado,
            resultado=resultado,
            notas_voz=notas,
        )
        db.add(v)
        visitas.append(v)
    await db.commit()
    print(f"  {len(visitas)} visitas creadas.")


async def seed_pipeline(db: AsyncSession, clientes: list[Cliente], props: list[Propiedad]):
    print("Seed pipeline deals...")
    etapa_prob = {
        PipelineEtapa.captado: 10,
        PipelineEtapa.publicado: 25,
        PipelineEtapa.visita: 40,
        PipelineEtapa.reserva: 70,
        PipelineEtapa.boleto: 90,
        PipelineEtapa.escrituracion: 100,
    }
    deals = []
    for _ in range(22):
        c = random.choice(clientes)
        p = random.choice(props)
        etapa = random.choices(
            list(PipelineEtapa),
            weights=[3, 5, 6, 3, 2, 1],
        )[0]
        precio_neg = p.precio_publicacion * random.uniform(0.92, 1.0)
        comision = precio_neg * 0.04
        d = PipelineDeal(
            cliente_id=c.id,
            propiedad_id=p.id,
            vendedor_id=c.vendedor_id,
            etapa=etapa,
            precio_negociado=round(precio_neg),
            moneda="USD",
            comision_estimada=round(comision),
            probabilidad_pct=etapa_prob[etapa],
            fecha_estimada_cierre=date.today() + timedelta(days=random.randint(15, 120)),
            notas=f"Deal en etapa {etapa.value}.",
        )
        db.add(d)
        deals.append(d)
    await db.commit()
    print(f"  {len(deals)} deals creados.")


async def seed_dmo_logs(db: AsyncSession, users: list[User], asignaciones: list):
    """Crea logs de los ultimos 7 dias para cada vendedor segun su template asignado."""
    print("Seed DMO logs (ultimos 7 dias x vendedor segun su template)...")
    count = 0
    for vendor, template in asignaciones:
        # Refresh para tener los bloques
        r = await db.execute(select(DmoBloque).where(DmoBloque.template_id == template.id).order_by(DmoBloque.orden))
        bloques = r.scalars().all()
        for delta in range(7):
            fecha = date.today() - timedelta(days=delta)
            for b in bloques:
                prob = 0.9 if b.es_money_block else 0.7
                completado = random.random() < prob
                if b.metrica_tipo == MetricaTipo.cantidad and completado:
                    base = max(b.metrica_meta, 1)
                    valor = random.randint(int(base * 0.6), int(base * 1.3))
                else:
                    valor = 0
                log = DmoLog(
                    vendedor_id=vendor.id,
                    bloque_id=b.id,
                    fecha=fecha,
                    completado=completado,
                    valor_metrica=valor,
                    notas=None,
                )
                db.add(log)
                count += 1
    await db.commit()
    print(f"  {count} logs creados.")


async def main():
    # Asegurar tablas creadas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await reset_all(db)
        users = await seed_users(db)
        coaches, templates = await seed_dmo_metodologias(db)
        asignaciones = await seed_dmo_assignments(db, users, templates)
        props = await seed_propiedades(db, users)
        clientes = await seed_clientes(db, users)
        await seed_autorizaciones(db, props, users)
        await seed_visitas(db, clientes, props)
        await seed_pipeline(db, clientes, props)
        await seed_dmo_logs(db, users, asignaciones)

    print("\n========================================")
    print(" Seed DEMO completo.")
    print("========================================")
    print(" Login:")
    print("  admin@beyker.demo / admin123")
    print("  gerente@beyker.demo / admin123")
    print("  lautaro@beyker.demo / admin123  (vendedor)")
    print("  romina@beyker.demo / admin123   (vendedor)")
    print("  federico@beyker.demo / admin123 (vendedor)")
    print("  camila@beyker.demo / admin123   (vendedor)")
    print("  martin@beyker.demo / admin123   (vendedor)")
    print("========================================")
    print(f" Coaches: {len(coaches)}  ({', '.join(c.nombre for c in coaches)})")
    print(f" Templates DMO: {len(templates)}")
    print(" Default inmobiliaria: 'DMO Argentina (Beyker)' (asignado al 60% de vendedores)")
    print("========================================")


if __name__ == "__main__":
    asyncio.run(main())
