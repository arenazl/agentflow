"""Endpoints para que el servicio Baileys (Node) persista su sesion en MySQL.

Auth: header X-API-Key (no JWT). Comparte el secret con WHATSAPP_WEBHOOK_API_KEY
o con el campo bot_config.baileys_api_key.
"""
import os
import base64
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from models.baileys_auth import BaileysAuthState
from models.bot_config import BotConfig
from pydantic import BaseModel

router = APIRouter()


async def _check_api_key(x_api_key: Optional[str], db: AsyncSession):
    """Acepta la API key si matchea con bot_config.baileys_api_key o el env var."""
    env_key = os.getenv("WHATSAPP_WEBHOOK_API_KEY", "")
    valid_keys = [env_key] if env_key else []
    try:
        r = await db.execute(select(BotConfig).where(BotConfig.id == 1))
        cfg = r.scalar_one_or_none()
        if cfg and cfg.baileys_api_key:
            valid_keys.append(cfg.baileys_api_key)
    except Exception:
        pass
    if not valid_keys or x_api_key not in valid_keys:
        raise HTTPException(401, "API key invalida")


class AuthSetPayload(BaseModel):
    value_b64: str


@router.get("/{key:path}")
async def get_value(
    key: str,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
):
    await _check_api_key(x_api_key, db)
    r = await db.execute(select(BaileysAuthState).where(BaileysAuthState.key == key))
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    # Devolvemos el blob crudo
    return Response(content=row.value, media_type="application/octet-stream")


@router.post("/{key:path}")
async def set_value(
    key: str,
    payload: AuthSetPayload,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
):
    await _check_api_key(x_api_key, db)
    try:
        value = base64.b64decode(payload.value_b64)
    except Exception:
        raise HTTPException(400, "value_b64 invalido")

    r = await db.execute(select(BaileysAuthState).where(BaileysAuthState.key == key))
    row = r.scalar_one_or_none()
    if row:
        row.value = value
    else:
        db.add(BaileysAuthState(key=key, value=value))
    await db.commit()
    return {"ok": True, "key": key, "size": len(value)}


@router.delete("/{key:path}")
async def delete_value(
    key: str,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
):
    await _check_api_key(x_api_key, db)
    r = await db.execute(select(BaileysAuthState).where(BaileysAuthState.key == key))
    row = r.scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True, "key": key}


@router.get("/")
async def list_keys(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
):
    await _check_api_key(x_api_key, db)
    r = await db.execute(select(BaileysAuthState.key))
    return {"keys": [k for k, in r.all()]}
