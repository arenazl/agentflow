from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from datetime import date as date_cls

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.dmo import DmoBloque, DmoLog, DmoTemplate, VendedorDmoAssignment, MetricaTipo
from schemas.dmo import (
    DmoLogCreate,
    DmoDiaResponse,
    DmoBloqueResponse,
    DmoLogResponse,
    DmoTemplateResponse,
)

router = APIRouter()


async def _resolve_template_for_vendedor(db: AsyncSession, vendedor_id: int) -> DmoTemplate | None:
    """Encuentra el template asignado al vendedor. Si no tiene, devuelve el default de la inmobiliaria."""
    asig = await db.execute(
        select(VendedorDmoAssignment).where(VendedorDmoAssignment.vendedor_id == vendedor_id)
    )
    a = asig.scalar_one_or_none()
    if a:
        r = await db.execute(
            select(DmoTemplate)
            .options(selectinload(DmoTemplate.bloques), selectinload(DmoTemplate.coach))
            .where(DmoTemplate.id == a.template_id)
        )
        t = r.scalar_one_or_none()
        if t:
            return t
    # Fallback: default oficial de la inmobiliaria
    r = await db.execute(
        select(DmoTemplate)
        .options(selectinload(DmoTemplate.bloques), selectinload(DmoTemplate.coach))
        .where(DmoTemplate.es_default_inmobiliaria == True)  # noqa: E712
        .limit(1)
    )
    return r.scalar_one_or_none()


def _template_to_dict(t: DmoTemplate) -> dict:
    item = DmoTemplateResponse.model_validate(t).model_dump(mode="json")
    item["coach_nombre"] = t.coach.nombre if t.coach else None
    item["bloques"] = [DmoBloqueResponse.model_validate(b).model_dump(mode="json") for b in t.bloques]
    return item


@router.get("/dia", response_model=DmoDiaResponse)
async def get_dia(
    fecha: date_cls | None = None,
    vendedor_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    fecha = fecha or date_cls.today()
    vid = vendedor_id or user.id
    if user.role == "vendedor":
        vid = user.id

    template = await _resolve_template_for_vendedor(db, vid)
    if not template:
        # Sin template todavia: devolver vacio
        user_r = await db.execute(select(User).where(User.id == vid))
        target_user = user_r.scalar_one()
        return DmoDiaResponse(
            fecha=fecha,
            template=None,
            bloques=[],
            logs=[],
            conversaciones_meta=target_user.meta_conversaciones_diaria,
            conversaciones_realizadas=0,
            pct_completitud=0,
        )

    bloques = sorted(template.bloques, key=lambda b: b.orden)
    bloque_ids = [b.id for b in bloques]

    logs_r = await db.execute(
        select(DmoLog).where(
            and_(DmoLog.vendedor_id == vid, DmoLog.fecha == fecha, DmoLog.bloque_id.in_(bloque_ids))
        )
    )
    logs = logs_r.scalars().all()

    # Suma de "conversaciones" = valores_metrica de bloques con label de conversaciones (o money block)
    conv_real = 0
    log_by_bloque = {l.bloque_id: l for l in logs}
    for b in bloques:
        log = log_by_bloque.get(b.id)
        if not log:
            continue
        is_conv = b.es_money_block or (
            b.metrica_label and "conversa" in b.metrica_label.lower()
        )
        if is_conv and b.metrica_tipo == MetricaTipo.cantidad:
            conv_real += log.valor_metrica

    completados = sum(1 for l in logs if l.completado)
    pct = int(round((completados / max(len(bloques), 1)) * 100))

    user_r = await db.execute(select(User).where(User.id == vid))
    target_user = user_r.scalar_one()

    return DmoDiaResponse(
        fecha=fecha,
        template=_template_to_dict(template),
        bloques=[DmoBloqueResponse.model_validate(b) for b in bloques],
        logs=[DmoLogResponse.model_validate(l) for l in logs],
        conversaciones_meta=target_user.meta_conversaciones_diaria,
        conversaciones_realizadas=conv_real,
        pct_completitud=pct,
    )


@router.post("/log")
async def upsert_log(
    payload: DmoLogCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Verificar que el bloque pertenezca al template asignado al vendedor
    bloque_r = await db.execute(select(DmoBloque).where(DmoBloque.id == payload.bloque_id))
    bloque = bloque_r.scalar_one_or_none()
    if not bloque:
        raise HTTPException(404, "Bloque no existe")

    existing = await db.execute(
        select(DmoLog).where(
            and_(
                DmoLog.vendedor_id == user.id,
                DmoLog.bloque_id == payload.bloque_id,
                DmoLog.fecha == payload.fecha,
            )
        ).order_by(DmoLog.id.asc())
    )
    rows = existing.scalars().all()
    log = rows[0] if rows else None
    if len(rows) > 1:
        for dup in rows[1:]:
            await db.delete(dup)
    if log:
        log.completado = payload.completado
        log.valor_metrica = payload.valor_metrica
        log.notas = payload.notas
    else:
        log = DmoLog(
            vendedor_id=user.id,
            bloque_id=payload.bloque_id,
            fecha=payload.fecha,
            completado=payload.completado,
            valor_metrica=payload.valor_metrica,
            notas=payload.notas,
        )
        db.add(log)
    await db.commit()
    await db.refresh(log)
    return DmoLogResponse.model_validate(log).model_dump(mode="json")
