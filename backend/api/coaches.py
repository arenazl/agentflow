from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.dmo import Coach, DmoTemplate
from schemas.dmo import CoachCreate, CoachUpdate, CoachResponse

router = APIRouter()


def _require_admin_or_gerente(user: User):
    if user.role not in ("admin", "gerente"):
        raise HTTPException(status_code=403, detail="Solo admin o gerente puede modificar coaches")


@router.get("/", response_model=list[CoachResponse])
async def list_coaches(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = await db.execute(
        select(Coach, func.count(DmoTemplate.id))
        .outerjoin(DmoTemplate, DmoTemplate.coach_id == Coach.id)
        .group_by(Coach.id)
        .order_by(Coach.es_oficial.desc(), Coach.nombre)
    )
    out = []
    for coach, cnt in rows.all():
        item = CoachResponse.model_validate(coach).model_dump(mode="json")
        item["templates_count"] = cnt or 0
        out.append(item)
    return out


@router.post("/", response_model=CoachResponse)
async def create_coach(
    payload: CoachCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    c = Coach(**payload.model_dump())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return CoachResponse.model_validate(c).model_dump(mode="json")


@router.patch("/{coach_id}", response_model=CoachResponse)
async def update_coach(
    coach_id: int,
    payload: CoachUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    r = await db.execute(select(Coach).where(Coach.id == coach_id))
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Coach no encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return CoachResponse.model_validate(c).model_dump(mode="json")


@router.delete("/{coach_id}")
async def delete_coach(
    coach_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    r = await db.execute(select(Coach).where(Coach.id == coach_id))
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Coach no encontrado")
    if c.es_oficial:
        raise HTTPException(400, "No se puede eliminar un coach oficial")
    await db.delete(c)
    await db.commit()
    return {"ok": True}
