from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.dmo import Coach, DmoTemplate, DmoBloque, VendedorDmoAssignment
from schemas.dmo import (
    DmoTemplateCreate,
    DmoTemplateUpdate,
    DmoTemplateResponse,
    DmoBloqueResponse,
)

router = APIRouter()


def _with_relations(stmt):
    """Eager-load coach + bloques para evitar lazy-load en contexto async."""
    return stmt.options(selectinload(DmoTemplate.bloques), selectinload(DmoTemplate.coach))


def _require_admin_or_gerente(user: User):
    if user.role not in ("admin", "gerente"):
        raise HTTPException(status_code=403, detail="Solo admin o gerente puede modificar templates")


def _template_to_dict(t: DmoTemplate, asignaciones: int = 0) -> dict:
    item = DmoTemplateResponse.model_validate(t).model_dump(mode="json")
    item["coach_nombre"] = t.coach.nombre if t.coach else None
    item["bloques"] = [DmoBloqueResponse.model_validate(b).model_dump(mode="json") for b in t.bloques]
    item["asignaciones_count"] = asignaciones
    return item


@router.get("/", response_model=list[DmoTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    r = await db.execute(
        _with_relations(
            select(DmoTemplate).order_by(DmoTemplate.es_default_inmobiliaria.desc(), DmoTemplate.nombre)
        )
    )
    templates = r.scalars().unique().all()
    # Conteo de asignaciones por template
    asig = await db.execute(
        select(VendedorDmoAssignment.template_id, func.count(VendedorDmoAssignment.id))
        .group_by(VendedorDmoAssignment.template_id)
    )
    counts = {tid: cnt for tid, cnt in asig.all()}
    return [_template_to_dict(t, counts.get(t.id, 0)) for t in templates]


@router.get("/{template_id}", response_model=DmoTemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    r = await db.execute(_with_relations(select(DmoTemplate).where(DmoTemplate.id == template_id)))
    t = r.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Template no encontrado")
    asig = await db.execute(
        select(func.count(VendedorDmoAssignment.id)).where(VendedorDmoAssignment.template_id == template_id)
    )
    cnt = asig.scalar_one() or 0
    return _template_to_dict(t, cnt)


@router.post("/", response_model=DmoTemplateResponse)
async def create_template(
    payload: DmoTemplateCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    coach = await db.execute(select(Coach).where(Coach.id == payload.coach_id))
    if not coach.scalar_one_or_none():
        raise HTTPException(400, "Coach no existe")

    # Si se marca como default, desmarcar otros
    if payload.es_default_inmobiliaria:
        existing = await db.execute(select(DmoTemplate).where(DmoTemplate.es_default_inmobiliaria == True))  # noqa: E712
        for t in existing.scalars().all():
            t.es_default_inmobiliaria = False

    t = DmoTemplate(
        coach_id=payload.coach_id,
        nombre=payload.nombre,
        descripcion=payload.descripcion,
        mercado=payload.mercado,
        activo=payload.activo,
        es_default_inmobiliaria=payload.es_default_inmobiliaria,
    )
    db.add(t)
    await db.flush()
    for idx, b in enumerate(payload.bloques):
        block = DmoBloque(
            template_id=t.id,
            nombre=b.nombre,
            descripcion=b.descripcion,
            hora_inicio=b.hora_inicio,
            hora_fin=b.hora_fin,
            color=b.color,
            orden=b.orden if b.orden is not None else idx,
            es_money_block=b.es_money_block,
            metrica_tipo=b.metrica_tipo,
            metrica_label=b.metrica_label,
            metrica_meta=b.metrica_meta,
        )
        db.add(block)
    await db.commit()
    await db.refresh(t)
    return _template_to_dict(t)


@router.patch("/{template_id}", response_model=DmoTemplateResponse)
async def update_template(
    template_id: int,
    payload: DmoTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    r = await db.execute(select(DmoTemplate).where(DmoTemplate.id == template_id))
    t = r.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Template no encontrado")

    data = payload.model_dump(exclude_unset=True)
    nuevos_bloques = data.pop("bloques", None)

    if data.get("es_default_inmobiliaria"):
        existing = await db.execute(
            select(DmoTemplate).where(DmoTemplate.es_default_inmobiliaria == True, DmoTemplate.id != template_id)  # noqa: E712
        )
        for o in existing.scalars().all():
            o.es_default_inmobiliaria = False

    for k, v in data.items():
        setattr(t, k, v)

    if nuevos_bloques is not None:
        await db.execute(delete(DmoBloque).where(DmoBloque.template_id == template_id))
        for idx, b in enumerate(nuevos_bloques):
            block = DmoBloque(
                template_id=template_id,
                nombre=b["nombre"],
                descripcion=b.get("descripcion"),
                hora_inicio=b["hora_inicio"],
                hora_fin=b["hora_fin"],
                color=b.get("color", "#3b82f6"),
                orden=b.get("orden", idx),
                es_money_block=b.get("es_money_block", False),
                metrica_tipo=b.get("metrica_tipo", "checkbox"),
                metrica_label=b.get("metrica_label"),
                metrica_meta=b.get("metrica_meta", 0),
            )
            db.add(block)

    await db.commit()
    await db.refresh(t)
    return _template_to_dict(t)


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    r = await db.execute(select(DmoTemplate).where(DmoTemplate.id == template_id))
    t = r.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Template no encontrado")
    asignaciones = await db.execute(
        select(func.count(VendedorDmoAssignment.id)).where(VendedorDmoAssignment.template_id == template_id)
    )
    if asignaciones.scalar_one():
        raise HTTPException(400, "Hay vendedores asignados a este template. Reasignalos primero.")
    await db.delete(t)
    await db.commit()
    return {"ok": True}


@router.post("/{template_id}/clone", response_model=DmoTemplateResponse)
async def clone_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_gerente(user)
    r = await db.execute(select(DmoTemplate).where(DmoTemplate.id == template_id))
    orig = r.scalar_one_or_none()
    if not orig:
        raise HTTPException(404, "Template no encontrado")

    nuevo = DmoTemplate(
        coach_id=orig.coach_id,
        nombre=f"{orig.nombre} (copia)",
        descripcion=orig.descripcion,
        mercado=orig.mercado,
        activo=True,
        es_default_inmobiliaria=False,
    )
    db.add(nuevo)
    await db.flush()
    for b in orig.bloques:
        db.add(DmoBloque(
            template_id=nuevo.id,
            nombre=b.nombre,
            descripcion=b.descripcion,
            hora_inicio=b.hora_inicio,
            hora_fin=b.hora_fin,
            color=b.color,
            orden=b.orden,
            es_money_block=b.es_money_block,
            metrica_tipo=b.metrica_tipo,
            metrica_label=b.metrica_label,
            metrica_meta=b.metrica_meta,
        ))
    await db.commit()
    await db.refresh(nuevo)
    return _template_to_dict(nuevo)
