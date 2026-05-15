import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  ABMPageClassic, ABMTableClassic, ABMBadgeClassic,
  type ABMColumnClassic, type ViewMode,
  TOOLBAR_IMPORT, TOOLBAR_EXPORT,
} from '../components/ui/classic'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonTable } from '../components/ui/Skeleton'
import { autorizacionesAPI } from '../services/api'
import type { Autorizacion } from '../types'

/* ---- Mock ---- */
function mockAut(i: number, over: Partial<Autorizacion>): Autorizacion {
  return {
    id: -i,
    propiedad_id: -i,
    propiedad_titulo: '',
    captador_id: 1,
    captador_nombre: 'Patricio B.',
    fecha_firma: new Date().toISOString(),
    fecha_vencimiento: new Date().toISOString(),
    precio_minimo: 0,
    moneda: 'USD',
    comision_pct: 4,
    exclusividad: false,
    estado: 'activa',
    ...over,
  } as Autorizacion
}

const today = new Date()
const daysFromNow = (d: number) => new Date(today.getTime() + d * 86400000).toISOString()

const MOCK: Autorizacion[] = [
  mockAut(1, { propiedad_titulo: 'Av. Libertador 4820 · 3°B', captador_nombre: 'Patricio B.',  fecha_firma: daysFromNow(-150), fecha_vencimiento: daysFromNow(6),   precio_minimo: 245000, comision_pct: 4.5, exclusividad: true,  estado: 'activa' }),
  mockAut(2, { propiedad_titulo: 'Vidal 1944 · PH',           captador_nombre: 'Martín Cravero', fecha_firma: daysFromNow(-90),  fecha_vencimiento: daysFromNow(11),  precio_minimo: 198000, comision_pct: 4.0, exclusividad: false, estado: 'activa' }),
  mockAut(3, { propiedad_titulo: 'Arenales 2230 · 5°C',       captador_nombre: 'Andrés Bertelli', fecha_firma: daysFromNow(-200), fecha_vencimiento: daysFromNow(-5),  precio_minimo: 410000, comision_pct: 5.0, exclusividad: true,  estado: 'activa' }),
  mockAut(4, { propiedad_titulo: 'Núñez · local comercial',   captador_nombre: 'Florencia Reig', fecha_firma: daysFromNow(-30),  fecha_vencimiento: daysFromNow(150), precio_minimo: 320000, comision_pct: 4.5, exclusividad: true,  estado: 'activa' }),
  mockAut(5, { propiedad_titulo: 'Honduras 5500 · loft',      captador_nombre: 'Lucía Sandoval', fecha_firma: daysFromNow(-220), fecha_vencimiento: daysFromNow(-40), precio_minimo: 138000, comision_pct: 4.0, exclusividad: false, estado: 'ejecutada' }),
  mockAut(6, { propiedad_titulo: 'Av. Alvear 1830',           captador_nombre: 'Lucía Sandoval', fecha_firma: daysFromNow(-12),  fecha_vencimiento: daysFromNow(168), precio_minimo: 580000, comision_pct: 5.0, exclusividad: true,  estado: 'activa' }),
]

/* ---- Helpers ---- */
function diasParaVencer(fecha: string): number {
  const d = new Date(fecha).getTime()
  const hoy = new Date().setHours(0, 0, 0, 0)
  return Math.round((d - hoy) / 86400000)
}

const ESTADO_BADGE: Record<string, { tone: 'success'|'danger'|'info'|'neutral'; icon: typeof CheckCircle2; label: string }> = {
  activa:    { tone: 'success', icon: CheckCircle2, label: 'Activa'    },
  vencida:   { tone: 'danger',  icon: XCircle,      label: 'Vencida'   },
  ejecutada: { tone: 'info',    icon: CheckCircle2, label: 'Ejecutada' },
  cancelada: { tone: 'neutral', icon: XCircle,      label: 'Cancelada' },
}

export function Autorizaciones() {
  const [serverData, setServerData] = useState<Autorizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeChip, setActiveChip] = useState('todas')
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('autorizaciones:view') as ViewMode) || 'table')

  useEffect(() => { localStorage.setItem('autorizaciones:view', view) }, [view])

  useEffect(() => {
    autorizacionesAPI.list()
      .then((r) => setServerData(r.data))
      .catch(() => toast.error('Error al cargar autorizaciones'))
      .finally(() => setLoading(false))
  }, [])

  const usingMock = !loading && serverData.length === 0
  const data = usingMock ? MOCK : serverData

  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return data
    return data.filter((a) =>
      (a.propiedad_titulo ?? '').toLowerCase().includes(q) ||
      (a.captador_nombre  ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const counts = useMemo(() => {
    const activas    = baseFiltered.filter((a) => a.estado === 'activa').length
    const porVencer  = baseFiltered.filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) >= 0 && diasParaVencer(a.fecha_vencimiento) <= 15).length
    const vencidas   = baseFiltered.filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) < 0).length
    const exclusivas = baseFiltered.filter((a) => a.exclusividad).length
    return { todas: baseFiltered.length, activas, porVencer, vencidas, exclusivas }
  }, [baseFiltered])

  const filtered = useMemo(() => {
    switch (activeChip) {
      case 'activas':    return baseFiltered.filter((a) => a.estado === 'activa')
      case 'por-vencer': return baseFiltered.filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) >= 0 && diasParaVencer(a.fecha_vencimiento) <= 15)
      case 'vencidas':   return baseFiltered.filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) < 0)
      case 'exclusivas': return baseFiltered.filter((a) => a.exclusividad)
      default:           return baseFiltered
    }
  }, [baseFiltered, activeChip])

  const columns: ABMColumnClassic<Autorizacion>[] = [
    {
      key: 'propiedad',
      header: 'Propiedad',
      sortable: true,
      sortValue: (a) => a.propiedad_titulo ?? '',
      render: (a) => (
        <div className="min-w-0">
          <div className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{a.propiedad_titulo}</div>
          {a.exclusividad && (
            <div className="mt-1">
              <ABMBadgeClassic label="Exclusiva" tone="gold" />
            </div>
          )}
        </div>
      ),
    },
    { key: 'captador', header: 'Captador', render: (a) => <span style={{ color: 'var(--text-primary)' }}>{a.captador_nombre}</span> },
    {
      key: 'fecha_firma',
      header: 'Firmada',
      sortable: true,
      sortValue: (a) => a.fecha_firma,
      render: (a) => (
        <span className="font-mono-tnum text-xs" style={{ color: 'var(--ink-3)' }}>
          {new Date(a.fecha_firma).toLocaleDateString('es-AR')}
        </span>
      ),
    },
    {
      key: 'fecha_vencimiento',
      header: 'Vence',
      sortable: true,
      sortValue: (a) => a.fecha_vencimiento,
      render: (a) => {
        const dias = diasParaVencer(a.fecha_vencimiento)
        const fechaTxt = new Date(a.fecha_vencimiento).toLocaleDateString('es-AR')
        let badge = null
        if (a.estado === 'activa') {
          if (dias < 0)        badge = <ABMBadgeClassic label={`vencida hace ${-dias}d`} tone="danger" />
          else if (dias <= 15) badge = <ABMBadgeClassic label={`en ${dias}d`} tone="warning" />
          else if (dias <= 30) badge = <ABMBadgeClassic label={`en ${dias}d`} tone="warm" />
        }
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono-tnum text-xs" style={{ color: 'var(--ink-3)' }}>{fechaTxt}</span>
            {badge}
          </div>
        )
      },
    },
    {
      key: 'precio_minimo',
      header: 'Precio mín.',
      numeric: true,
      render: (a) => (
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {a.moneda} {a.precio_minimo.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'comision_pct',
      header: 'Comisión',
      numeric: true,
      render: (a) => <span className="font-semibold">{a.comision_pct}%</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (a) => {
        const cfg = ESTADO_BADGE[a.estado] ?? { tone: 'neutral' as const, icon: Clock, label: a.estado }
        return <ABMBadgeClassic label={cfg.label} icon={cfg.icon} tone={cfg.tone} />
      },
    },
  ]

  const contextData = useMemo(() => {
    const proximas = data
      .filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) >= 0 && diasParaVencer(a.fecha_vencimiento) <= 15)
      .slice(0, 5)
      .map((a) => ({ id: a.id, propiedad_titulo: a.propiedad_titulo, dias_para_vencer: diasParaVencer(a.fecha_vencimiento), captador_nombre: a.captador_nombre }))
    const vencidas = data
      .filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) < 0)
      .slice(0, 5)
      .map((a) => ({ id: a.id, propiedad_titulo: a.propiedad_titulo, dias_vencida: -diasParaVencer(a.fecha_vencimiento) }))
    return {
      using_mock: usingMock,
      total_activas: counts.activas,
      proximas_a_vencer_15d: proximas,
      vencidas_no_limpiadas: vencidas,
    }
  }, [data, counts, usingMock])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6 space-y-4">
        <ABMPageClassic
          eyebrow="Cartera · Documentación"
          title="Autorizaciones"
          subtitleParts={[
            { strong: counts.activas,    label: 'autorizaciones activas' },
            { strong: counts.porVencer,  label: 'vencen en 15 días' },
            { strong: counts.vencidas,   label: 'vencidas sin limpiar' },
          ]}
          filterChips={[
            { key: 'todas',      label: 'Todas',          count: counts.todas      },
            { key: 'activas',    label: 'Activas',        count: counts.activas    },
            { key: 'por-vencer', label: 'Por vencer 15d', count: counts.porVencer  },
            { key: 'vencidas',   label: 'Vencidas',       count: counts.vencidas   },
            { key: 'exclusivas', label: 'Exclusivas',     count: counts.exclusivas },
          ]}
          activeChip={activeChip}
          onChipChange={setActiveChip}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por propiedad o captador..."
          toolbar={[
            { ...TOOLBAR_IMPORT, variant: 'outline', onClick: () => toast.info('Importar — próximamente') },
            { ...TOOLBAR_EXPORT, variant: 'outline', onClick: () => toast.info('Exportar — próximamente') },
          ]}
          onAdd={() => toast.info('Alta de autorización — próximamente')}
          addLabel="Nueva autorización"
          view={view}
          onViewChange={setView}
          loading={loading}
          isEmpty={!loading && filtered.length === 0}
          emptyMessage="No hay autorizaciones con esos filtros."
        >
          {/* Alerta destacada si hay vencidas sin limpiar */}
          {!loading && counts.vencidas > 0 && (
            <div
              className="rounded-xl p-4 flex items-start gap-3 mb-4"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.20)',
              }}
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
              <div className="text-sm">
                <strong style={{ color: 'var(--color-danger)' }}>
                  {counts.vencidas} autorización(es) vencida(s)
                </strong>{' '}
                <span style={{ color: 'var(--text-primary)' }}>todavía figuran como activas.</span>
                <span className="ml-1" style={{ color: 'var(--ink-4)' }}>
                  Cambialas a "vencida" para no falsear ranking ni reportes.
                </span>
              </div>
            </div>
          )}

          {loading ? (
            <SkeletonTable rows={8} cols={7} />
          ) : (
            <ABMTableClassic
              data={filtered}
              columns={columns}
              keyExtractor={(a) => a.id}
            />
          )}
        </ABMPageClassic>
      </div>
      <AICoachPanel screen="autorizaciones" contextData={contextData} />
    </div>
  )
}
