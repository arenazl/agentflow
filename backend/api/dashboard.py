from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date as date_cls, timedelta

from core.database import get_db
from core.security import get_current_user
from models.user import User, UserRole
from models.cliente import Cliente, ClienteEstado
from models.propiedad import Propiedad, PropiedadEstado
from models.visita import Visita, VisitaEstado
from models.pipeline import PipelineDeal, PipelineEtapa
from models.dmo import DmoLog

router = APIRouter()


@router.get("/resumen")
async def resumen(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    hoy = date_cls.today()
    hace_7 = hoy - timedelta(days=7)

    # Vendedor: solo lo suyo. Gerente/admin: todo.
    is_vendedor = user.role == UserRole.vendedor.value or user.role == UserRole.vendedor

    # Conteos
    q_clientes = select(func.count(Cliente.id))
    q_propiedades = select(func.count(Propiedad.id))
    q_visitas_semana = select(func.count(Visita.id)).where(Visita.fecha_hora >= hace_7)
    q_deals_abiertos = select(func.count(PipelineDeal.id)).where(
        PipelineDeal.etapa != PipelineEtapa.escrituracion
    )

    if is_vendedor:
        q_clientes = q_clientes.where(Cliente.vendedor_id == user.id)
        q_propiedades = q_propiedades.where(Propiedad.captador_id == user.id)
        q_visitas_semana = q_visitas_semana.where(Visita.vendedor_id == user.id)
        q_deals_abiertos = q_deals_abiertos.where(PipelineDeal.vendedor_id == user.id)

    total_clientes = (await db.execute(q_clientes)).scalar() or 0
    total_propiedades = (await db.execute(q_propiedades)).scalar() or 0
    visitas_semana = (await db.execute(q_visitas_semana)).scalar() or 0
    deals_abiertos = (await db.execute(q_deals_abiertos)).scalar() or 0

    # Conversaciones hoy del vendedor (o suma del equipo si es gerente)
    q_conv = select(func.coalesce(func.sum(DmoLog.valor_metrica), 0)).where(DmoLog.fecha == hoy)
    if is_vendedor:
        q_conv = q_conv.where(DmoLog.vendedor_id == user.id)
    conv_hoy = (await db.execute(q_conv)).scalar() or 0

    # Pipeline por etapa
    q_pipeline = select(PipelineDeal.etapa, func.count(PipelineDeal.id)).group_by(PipelineDeal.etapa)
    if is_vendedor:
        q_pipeline = q_pipeline.where(PipelineDeal.vendedor_id == user.id)
    pipeline_etapas = {}
    for etapa, count in (await db.execute(q_pipeline)).all():
        key = etapa.value if hasattr(etapa, "value") else etapa
        pipeline_etapas[key] = count

    return {
        "total_clientes": total_clientes,
        "total_propiedades": total_propiedades,
        "visitas_semana": visitas_semana,
        "deals_abiertos": deals_abiertos,
        "conversaciones_hoy": conv_hoy,
        "meta_conversaciones": user.meta_conversaciones_diaria,
        "pipeline_etapas": pipeline_etapas,
    }


@router.get("/ranking-vendedores")
async def ranking_vendedores(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    hoy = date_cls.today()
    hace_30 = hoy - timedelta(days=30)

    users_r = await db.execute(select(User).where(User.role == UserRole.vendedor))
    vendedores = users_r.scalars().all()
    rows = []
    for v in vendedores:
        conv_mes = (await db.execute(
            select(func.coalesce(func.sum(DmoLog.valor_metrica), 0))
            .where(and_(DmoLog.vendedor_id == v.id, DmoLog.fecha >= hace_30))
        )).scalar() or 0

        visitas_mes = (await db.execute(
            select(func.count(Visita.id))
            .where(and_(Visita.vendedor_id == v.id, Visita.fecha_hora >= hace_30))
        )).scalar() or 0

        clientes_total = (await db.execute(
            select(func.count(Cliente.id)).where(Cliente.vendedor_id == v.id)
        )).scalar() or 0

        rows.append({
            "vendedor_id": v.id,
            "nombre": f"{v.nombre} {v.apellido}",
            "conversaciones_mes": conv_mes,
            "visitas_mes": visitas_mes,
            "clientes_total": clientes_total,
            "meta_conversaciones": v.meta_conversaciones_diaria,
        })
    rows.sort(key=lambda r: r["conversaciones_mes"], reverse=True)
    return rows
