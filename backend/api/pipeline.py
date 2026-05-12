from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.pipeline import PipelineDeal
from schemas.pipeline import PipelineDealResponse, PipelineDealCreate, PipelineDealUpdate

router = APIRouter()


def _to_response(d: PipelineDeal) -> dict:
    out = PipelineDealResponse.model_validate(d).model_dump()
    out["vendedor_nombre"] = f"{d.vendedor.nombre} {d.vendedor.apellido}" if d.vendedor else None
    out["cliente_nombre"] = f"{d.cliente.nombre} {d.cliente.apellido}" if d.cliente else None
    out["propiedad_titulo"] = d.propiedad.titulo if d.propiedad else None
    return out


@router.get("/")
async def list_deals(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(PipelineDeal).order_by(PipelineDeal.updated_at.desc())
    if user.role == "vendedor":
        stmt = stmt.where(PipelineDeal.vendedor_id == user.id)
    result = await db.execute(stmt)
    return [_to_response(d) for d in result.scalars().all()]


@router.post("/")
async def create_deal(
    payload: PipelineDealCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    vendedor_id = payload.vendedor_id or user.id
    d = PipelineDeal(**payload.model_dump(exclude={"vendedor_id"}), vendedor_id=vendedor_id)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return _to_response(d)


@router.patch("/{deal_id}")
async def update_deal(
    deal_id: int,
    payload: PipelineDealUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(PipelineDeal).where(PipelineDeal.id == deal_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(d, k, v)
    await db.commit()
    await db.refresh(d)
    return _to_response(d)


@router.delete("/{deal_id}")
async def delete_deal(
    deal_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(PipelineDeal).where(PipelineDeal.id == deal_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    await db.delete(d)
    await db.commit()
    return {"ok": True}
