from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.autorizacion import Autorizacion
from schemas.autorizacion import AutorizacionResponse, AutorizacionCreate, AutorizacionUpdate

router = APIRouter()


def _to_response(a: Autorizacion) -> dict:
    d = AutorizacionResponse.model_validate(a).model_dump()
    d["captador_nombre"] = f"{a.captador.nombre} {a.captador.apellido}" if a.captador else None
    d["propiedad_titulo"] = a.propiedad.titulo if a.propiedad else None
    return d


@router.get("/")
async def list_autorizaciones(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Autorizacion).order_by(Autorizacion.fecha_firma.desc()))
    return [_to_response(a) for a in result.scalars().all()]


@router.post("/")
async def create_autorizacion(
    payload: AutorizacionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    captador_id = payload.captador_id or user.id
    a = Autorizacion(**payload.model_dump(exclude={"captador_id"}), captador_id=captador_id)
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return _to_response(a)


@router.patch("/{aut_id}")
async def update_autorizacion(
    aut_id: int,
    payload: AutorizacionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Autorizacion).where(Autorizacion.id == aut_id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Autorizacion no encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    await db.commit()
    await db.refresh(a)
    return _to_response(a)
