from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.propiedad import Propiedad
from schemas.propiedad import PropiedadResponse, PropiedadCreate, PropiedadUpdate

router = APIRouter()


def _to_response(p: Propiedad) -> dict:
    d = PropiedadResponse.model_validate(p).model_dump()
    d["captador_nombre"] = f"{p.captador.nombre} {p.captador.apellido}" if p.captador else None
    return d


@router.get("/")
async def list_propiedades(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Propiedad).options(selectinload(Propiedad.fotos)).order_by(Propiedad.created_at.desc())
    result = await db.execute(stmt)
    return [_to_response(p) for p in result.scalars().all()]


@router.get("/{propiedad_id}")
async def get_propiedad(
    propiedad_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Propiedad).options(selectinload(Propiedad.fotos)).where(Propiedad.id == propiedad_id)
    result = await db.execute(stmt)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    return _to_response(p)


@router.post("/")
async def create_propiedad(
    payload: PropiedadCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    captador_id = payload.captador_id or user.id
    p = Propiedad(**payload.model_dump(exclude={"captador_id"}), captador_id=captador_id)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    stmt = select(Propiedad).options(selectinload(Propiedad.fotos)).where(Propiedad.id == p.id)
    result = await db.execute(stmt)
    p = result.scalar_one()
    return _to_response(p)


@router.patch("/{propiedad_id}")
async def update_propiedad(
    propiedad_id: int,
    payload: PropiedadUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Propiedad).where(Propiedad.id == propiedad_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    await db.commit()
    stmt = select(Propiedad).options(selectinload(Propiedad.fotos)).where(Propiedad.id == p.id)
    result = await db.execute(stmt)
    p = result.scalar_one()
    return _to_response(p)


@router.delete("/{propiedad_id}")
async def delete_propiedad(
    propiedad_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Propiedad).where(Propiedad.id == propiedad_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    await db.delete(p)
    await db.commit()
    return {"ok": True}
