"""Configuracion del bot WhatsApp + base de conocimiento editable desde la UI."""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func

from core.database import Base


class BotConfig(Base):
    """Singleton: una sola fila (id=1) con toda la configuracion del bot."""
    __tablename__ = "bot_config"

    id = Column(Integer, primary_key=True)

    # --- Tab 1: Datos de la empresa ---
    telefono_oficial = Column(String(40), nullable=True)
    email_oficial = Column(String(150), nullable=True)
    direccion = Column(String(300), nullable=True)
    web = Column(String(200), nullable=True)
    instagram = Column(String(100), nullable=True)

    horario_semana = Column(String(100), nullable=True)
    horario_sabado = Column(String(100), nullable=True)
    horario_domingo = Column(String(100), nullable=True)

    comision_compra_vendedor = Column(String(60), nullable=True)
    comision_compra_comprador = Column(String(60), nullable=True)
    comision_alquiler_propietario = Column(String(60), nullable=True)
    comision_alquiler_inquilino = Column(String(60), nullable=True)
    reserva_pct_estandar = Column(String(40), nullable=True)
    reserva_plazo_aceptacion = Column(String(60), nullable=True)

    # --- Tab 2: Conexion WhatsApp (Baileys) ---
    baileys_service_url = Column(String(300), nullable=True)
    baileys_api_key = Column(String(200), nullable=True)
    numero_oficial_wa = Column(String(40), nullable=True)  # +549...

    # --- Tab 3: Tono y reglas ---
    mensaje_bienvenida = Column(Text, nullable=True)
    mensaje_off_hours = Column(Text, nullable=True)
    tono_extra = Column(Text, nullable=True)  # se appendea al beyker_tono.md
    palabras_derivacion_extra = Column(Text, nullable=True)  # lista, una por linea

    # --- Tab 4: identidad / diferenciador editable ---
    identidad_extra = Column(Text, nullable=True)
    diferencial_extra = Column(Text, nullable=True)

    # --- Tab 5: Joda de hoy (perfil custom proactivo) ---
    joda_telefono = Column(String(40), nullable=True)
    joda_prompt = Column(Text, nullable=True)
    joda_saludo = Column(Text, nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BotFaq(Base):
    """Pares pregunta/respuesta que el bot usa como prioridad sobre los MDs estaticos."""
    __tablename__ = "bot_faqs"

    id = Column(Integer, primary_key=True, index=True)
    pregunta = Column(String(500), nullable=False)
    respuesta = Column(Text, nullable=False)
    orden = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
