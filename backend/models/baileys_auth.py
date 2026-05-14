"""Persistencia de la sesion Baileys en MySQL para sobrevivir reinicios del dyno Heroku."""
from sqlalchemy import Column, String, LargeBinary, DateTime
from sqlalchemy.sql import func

from core.database import Base


class BaileysAuthState(Base):
    """Key-value store de los archivos de auth de Baileys (creds.json, keys/, etc).

    Baileys guarda muchos archivos chicos cuando usa useMultiFileAuthState.
    Cada uno termina como una fila aca, indexado por su clave (ej: 'creds', 'session-X', etc).
    """
    __tablename__ = "baileys_auth"

    key = Column(String(200), primary_key=True)
    value = Column(LargeBinary, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
