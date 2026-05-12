from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import get_current_user
from models.user import User, UserRole
from models.dmo import VendedorDmoAssignment, DmoTemplate
from schemas.dmo import VendedorAssignmentCreate, VendedorAssignmentResponse

router = APIRouter()


def _require_admin_or_gerente(user: User):
    if user.role not in ("admin", "gerente"):
        raise HTTPException(status_code=403, detail="Solo admin o gerente puede asignar DMOs")


def _to_response(a: VendedorDmoAssignment) -> dict:
    item = VendedorAssignmentResponse.model_validate(a).model_dump(mode="json")
    if a.vendedor:
        item["vendedor_nombre"] = f"{a.vendedor.nombre} {a.vendedor.apellido}"
    if a.template:
        item["template_nombre"] = a.template.nombre
        if a.template.coach:
            item["coach_nombre"] = a.template.coach.nombre
    return item


@router.get("/", response_model=list[VendedorAssignmentResponse])
async def list_assignments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    r = await db.execute(select(VendedorDmoAssignment))
    return [_to_response(a) for a in r.scalars().all()]


@router.post("/", response_model=VendedorAssignmentResponse)
async def upsert_assignment(
    payload: VendedorAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)

    vendor = await db.execute(select(User).where(User.id == payload.vendedor_id))
    v = vendor.scalar_one_or_none()
    if not v or v.role != UserRole.vendedor:
        raise HTTPException(400, "El usuario no es vendedor")

    tpl = await db.execute(select(DmoTemplate).where(DmoTemplate.id == payload.template_id))
    if not tpl.scalar_one_or_none():
        raise HTTPException(400, "Template no existe")

    existing = await db.execute(
        select(VendedorDmoAssignment).where(VendedorDmoAssignment.vendedor_id == payload.vendedor_id)
    )
    a = existing.scalar_one_or_none()
    if a:
        a.template_id = payload.template_id
    else:
        a = VendedorDmoAssignment(vendedor_id=payload.vendedor_id, template_id=payload.template_id)
        db.add(a)
    await db.commit()
    await db.refresh(a)
    return _to_response(a)


@router.delete("/{vendedor_id}")
async def remove_assignment(
    vendedor_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    r = await db.execute(
        select(VendedorDmoAssignment).where(VendedorDmoAssignment.vendedor_id == vendedor_id)
    )
    a = r.scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Asignacion no encontrada")
    await db.delete(a)
    await db.commit()
    return {"ok": True}
