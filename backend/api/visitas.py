from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.visita import Visita
from schemas.visita import VisitaResponse, VisitaCreate, VisitaUpdate

router = APIRouter()


def _to_response(v: Visita) -> dict:
    d = VisitaResponse.model_validate(v).model_dump()
    d["vendedor_nombre"] = f"{v.vendedor.nombre} {v.vendedor.apellido}" if v.vendedor else None
    d["cliente_nombre"] = f"{v.cliente.nombre} {v.cliente.apellido}" if v.cliente else None
    d["propiedad_titulo"] = v.propiedad.titulo if v.propiedad else None
    return d


@router.get("/")
async def list_visitas(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Visita).order_by(Visita.fecha_hora.desc())
    if user.role == "vendedor":
        stmt = stmt.where(Visita.vendedor_id == user.id)
    result = await db.execute(stmt)
    return [_to_response(v) for v in result.scalars().all()]


@router.post("/")
async def create_visita(
    payload: VisitaCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    vendedor_id = payload.vendedor_id or user.id
    v = Visita(**payload.model_dump(exclude={"vendedor_id"}), vendedor_id=vendedor_id)
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return _to_response(v)


@router.patch("/{visita_id}")
async def update_visita(
    visita_id: int,
    payload: VisitaUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Visita).where(Visita.id == visita_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Visita no encontrada")
    for k, val in payload.model_dump(exclude_unset=True).items():
        setattr(v, k, val)
    await db.commit()
    await db.refresh(v)
    return _to_response(v)


@router.delete("/{visita_id}")
async def delete_visita(
    visita_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Visita).where(Visita.id == visita_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Visita no encontrada")
    await db.delete(v)
    await db.commit()
    return {"ok": True}
