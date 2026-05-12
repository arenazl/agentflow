from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.cliente import Cliente
from schemas.cliente import ClienteResponse, ClienteCreate, ClienteUpdate

router = APIRouter()


def _to_response(c: Cliente) -> dict:
    d = ClienteResponse.model_validate(c).model_dump()
    d["vendedor_nombre"] = f"{c.vendedor.nombre} {c.vendedor.apellido}" if c.vendedor else None
    return d


@router.get("/")
async def list_clientes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Cliente).order_by(Cliente.created_at.desc())
    if user.role == "vendedor":
        stmt = stmt.where(Cliente.vendedor_id == user.id)
    result = await db.execute(stmt)
    return [_to_response(c) for c in result.scalars().all()]


@router.post("/")
async def create_cliente(
    payload: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    vendedor_id = payload.vendedor_id or user.id
    c = Cliente(**payload.model_dump(exclude={"vendedor_id"}), vendedor_id=vendedor_id)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _to_response(c)


@router.patch("/{cliente_id}")
async def update_cliente(
    cliente_id: int,
    payload: ClienteUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if user.role == "vendedor" and c.vendedor_id != user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return _to_response(c)


@router.delete("/{cliente_id}")
async def delete_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if user.role == "vendedor" and c.vendedor_id != user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    await db.delete(c)
    await db.commit()
    return {"ok": True}
