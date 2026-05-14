"""Endpoints para gestionar la configuracion del bot WhatsApp + FAQ desde la UI."""
import httpx
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.bot_config import BotConfig, BotFaq
from schemas.bot_config import (
    BotConfigBase,
    BotConfigResponse,
    BaileysStatus,
    BotFaqCreate,
    BotFaqUpdate,
    BotFaqResponse,
)

router = APIRouter()


def _require_admin_or_gerente(user: User):
    if user.role not in ("admin", "gerente"):
        raise HTTPException(403, "Solo admin o gerente puede modificar la config del bot")


async def _get_or_create_config(db: AsyncSession) -> BotConfig:
    r = await db.execute(select(BotConfig).where(BotConfig.id == 1))
    cfg = r.scalar_one_or_none()
    if not cfg:
        cfg = BotConfig(id=1)
        db.add(cfg)
        await db.flush()
    return cfg


# ---------- Config endpoints ----------

@router.get("/", response_model=BotConfigResponse)
async def get_config(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cfg = await _get_or_create_config(db)
    await db.commit()
    return BotConfigResponse.model_validate(cfg)


@router.patch("/", response_model=BotConfigResponse)
async def update_config(
    payload: BotConfigBase,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    cfg = await _get_or_create_config(db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cfg, k, v)
    await db.commit()
    await db.refresh(cfg)
    # Invalidar cache del knowledge cuando cambia config
    try:
        from services import whatsapp_bot
        whatsapp_bot._KNOWLEDGE_CACHE = None
    except Exception:
        pass
    return BotConfigResponse.model_validate(cfg)


@router.get("/baileys-status", response_model=BaileysStatus)
async def baileys_status(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Pinguea al servicio Baileys (Node) configurado y devuelve estado de conexion."""
    cfg = await _get_or_create_config(db)
    now = datetime.utcnow()

    if not cfg.baileys_service_url:
        return BaileysStatus(configurado=False, ok=False, last_checked=now,
                             error="No hay baileys_service_url configurado")

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{cfg.baileys_service_url}/health")
            data = r.json()
            return BaileysStatus(
                configurado=True,
                ok=data.get("ok", False),
                baileys_ready=data.get("baileys_ready", False),
                has_pending_qr=data.get("has_pending_qr", False),
                numero=data.get("user"),
                last_checked=now,
            )
    except Exception as e:
        return BaileysStatus(configurado=True, ok=False, last_checked=now, error=str(e))


# ---------- FAQ endpoints ----------

@router.get("/faqs", response_model=List[BotFaqResponse])
async def list_faqs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    r = await db.execute(select(BotFaq).order_by(BotFaq.orden, BotFaq.id))
    return [BotFaqResponse.model_validate(f) for f in r.scalars().all()]


@router.post("/faqs", response_model=BotFaqResponse)
async def create_faq(
    payload: BotFaqCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    faq = BotFaq(**payload.model_dump())
    db.add(faq)
    await db.commit()
    await db.refresh(faq)
    try:
        from services import whatsapp_bot
        whatsapp_bot._KNOWLEDGE_CACHE = None
    except Exception:
        pass
    return BotFaqResponse.model_validate(faq)


@router.patch("/faqs/{faq_id}", response_model=BotFaqResponse)
async def update_faq(
    faq_id: int,
    payload: BotFaqUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    r = await db.execute(select(BotFaq).where(BotFaq.id == faq_id))
    faq = r.scalar_one_or_none()
    if not faq:
        raise HTTPException(404, "FAQ no encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(faq, k, v)
    await db.commit()
    await db.refresh(faq)
    try:
        from services import whatsapp_bot
        whatsapp_bot._KNOWLEDGE_CACHE = None
    except Exception:
        pass
    return BotFaqResponse.model_validate(faq)


@router.delete("/faqs/{faq_id}")
async def delete_faq(
    faq_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    r = await db.execute(select(BotFaq).where(BotFaq.id == faq_id))
    faq = r.scalar_one_or_none()
    if not faq:
        raise HTTPException(404, "FAQ no encontrada")
    await db.delete(faq)
    await db.commit()
    try:
        from services import whatsapp_bot
        whatsapp_bot._KNOWLEDGE_CACHE = None
    except Exception:
        pass
    return {"ok": True}
