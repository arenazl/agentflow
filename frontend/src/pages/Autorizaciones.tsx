import { useEffect, useMemo, useState } from 'react'
import { FileText, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ABMPage } from '../components/ui/ABMPage'
import { ABMTable, ABMColumn } from '../components/ui/ABMTable'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonTable } from '../components/ui/Skeleton'
import { autorizacionesAPI } from '../services/api'
import type { Autorizacion } from '../types'

const ESTADO_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  activa:     { color: 'var(--color-success)', icon: CheckCircle2,   label: 'Activa' },
  vencida:    { color: 'var(--color-danger)',  icon: XCircle,        label: 'Vencida' },
  ejecutada:  { color: 'var(--color-blue)',    icon: CheckCircle2,   label: 'Ejecutada' },
  cancelada:  { color: 'var(--text-secondary)', icon: XCircle,       label: 'Cancelada' },
}

function diasParaVencer(fechaVenc: string): number {
  const d = new Date(fechaVenc).getTime()
  const hoy = new Date().setHours(0, 0, 0, 0)
  return Math.round((d - hoy) / (1000 * 60 * 60 * 24))
}

function VenceCell({ fecha, estado }: { fecha: string; estado: string }) {
  const dias = diasParaVencer(fecha)
  const fechaTxt = new Date(fecha).toLocaleDateString('es-AR')
  let urgenciaColor = 'var(--text-secondary)'
  let label = `${dias}d`
  let bgUrgencia = 'transparent'

  if (estado === 'activa') {
    if (dias < 0) {
      urgenciaColor = 'var(--color-danger)'
      label = `vencida hace ${-dias}d`
      bgUrgencia = 'var(--color-flame-bg)'
    } else if (dias <= 15) {
      urgenciaColor = 'var(--color-flame)'
      label = `${dias}d`
      bgUrgencia = 'var(--color-flame-bg)'
    } else if (dias <= 30) {
      urgenciaColor = 'var(--color-warning)'
      label = `${dias}d`
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">{fechaTxt}</span>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
        style={{ backgroundColor: bgUrgencia, color: urgenciaColor }}
      >
        {label}
      </span>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] ?? { color: 'var(--text-secondary)', icon: Clock, label: estado }
  const Icon = cfg.icon
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold"
      style={{ backgroundColor: `${cfg.color}1f`, color: cfg.color }}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function StatBlock({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div
      className="rounded-lg border p-3 flex-1 min-w-[140px]"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="text-2xl font-bold mt-1" style={{ color: accent }}>{value}</div>
    </div>
  )
}

export function Autorizaciones() {
  const [data, setData] = useState<Autorizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    autorizacionesAPI.list()
      .then((r) => setData(r.data))
      .catch(() => toast.error('Error al cargar autorizaciones'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = data.filter((a) => {
    const q = search.toLowerCase()
    return (a.propiedad_titulo ?? '').toLowerCase().includes(q) ||
           (a.captador_nombre ?? '').toLowerCase().includes(q)
  })

  const stats = useMemo(() => {
    const activas = data.filter((a) => a.estado === 'activa').length
    const vencidasNoLimpiadas = data.filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) < 0).length
    const proximasVencer = data.filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) >= 0 && diasParaVencer(a.fecha_vencimiento) <= 15).length
    const comisionPromedio = data.length
      ? (data.reduce((acc, a) => acc + a.comision_pct, 0) / data.length).toFixed(1)
      : '0.0'
    return { activas, vencidasNoLimpiadas, proximasVencer, comisionPromedio }
  }, [data])

  const contextData = useMemo(() => {
    const proximas = data
      .filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) >= 0 && diasParaVencer(a.fecha_vencimiento) <= 15)
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        propiedad_titulo: a.propiedad_titulo,
        dias_para_vencer: diasParaVencer(a.fecha_vencimiento),
        captador_nombre: a.captador_nombre,
      }))
    const vencidasNoLimpiadas = data
      .filter((a) => a.estado === 'activa' && diasParaVencer(a.fecha_vencimiento) < 0)
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        propiedad_titulo: a.propiedad_titulo,
        dias_vencida: -diasParaVencer(a.fecha_vencimiento),
      }))
    return {
      total_activas: stats.activas,
      total_vencidas_no_limpiadas: stats.vencidasNoLimpiadas,
      proximas_a_vencer_15d: proximas,
      vencidas_no_limpiadas: vencidasNoLimpiadas,
      comision_promedio_pct: parseFloat(stats.comisionPromedio),
    }
  }, [data, stats])

  const columns: ABMColumn<Autorizacion>[] = [
    {
      key: 'propiedad',
      header: 'Propiedad',
      render: (a) => (
        <div className="flex items-center gap-2">
          <div
            className="w-1 self-stretch rounded-full flex-shrink-0"
            style={{ backgroundColor: ESTADO_CONFIG[a.estado]?.color ?? 'var(--text-secondary)' }}
          />
          <div className="min-w-0">
            <div className="font-semibold truncate">{a.propiedad_titulo}</div>
            {a.exclusividad && (
              <span
                className="inline-block text-[10px] mt-0.5 px-1.5 py-0.5 rounded font-semibold"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
                  color: 'var(--color-primary)',
                }}
              >
                EXCLUSIVA
              </span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'captador', header: 'Captador', render: (a) => a.captador_nombre },
    {
      key: 'fecha_firma',
      header: 'Firmada',
      sortable: true,
      sortValue: (a) => a.fecha_firma,
      render: (a) => <span className="font-mono text-xs">{new Date(a.fecha_firma).toLocaleDateString('es-AR')}</span>,
    },
    {
      key: 'fecha_vencimiento',
      header: 'Vence',
      sortable: true,
      sortValue: (a) => a.fecha_vencimiento,
      render: (a) => <VenceCell fecha={a.fecha_vencimiento} estado={a.estado} />,
    },
    {
      key: 'precio_minimo',
      header: 'Precio mín.',
      render: (a) => (
        <span className="font-mono font-semibold" style={{ color: 'var(--color-primary)' }}>
          {a.moneda} {a.precio_minimo.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'comision_pct',
      header: 'Comisión',
      render: (a) => <span className="font-semibold">{a.comision_pct}%</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (a) => <EstadoBadge estado={a.estado} />,
    },
  ]

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-2xl font-bold">Autorizaciones de venta</h1>
        </div>

        {/* Alertas KPI */}
        {!loading && (
          <div className="flex flex-wrap gap-3">
            <StatBlock label="Activas" value={stats.activas} accent="var(--color-success)" />
            <StatBlock label="Próximas a vencer (15d)" value={stats.proximasVencer} accent="var(--color-flame)" />
            <StatBlock label="Vencidas sin limpiar" value={stats.vencidasNoLimpiadas} accent="var(--color-danger)" />
            <StatBlock label="Comisión promedio" value={`${stats.comisionPromedio}%`} accent="var(--color-accent)" />
          </div>
        )}

        {/* Alerta destacada si hay vencidas sin limpiar */}
        {!loading && stats.vencidasNoLimpiadas > 0 && (
          <div
            className="rounded-lg border p-3 flex items-start gap-3 animate-fade-in-up"
            style={{
              backgroundColor: 'var(--color-flame-bg)',
              borderColor: 'var(--color-flame)',
            }}
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-flame)' }} />
            <div className="text-sm">
              <span className="font-semibold" style={{ color: 'var(--color-flame)' }}>
                {stats.vencidasNoLimpiadas} autorización(es) vencida(s)
              </span>{' '}
              <span style={{ color: 'var(--text-primary)' }}>todavía figuran como activas.</span>
              <span className="ml-1" style={{ color: 'var(--text-secondary)' }}>
                Cambiá el estado a "vencida" para no falsear ranking ni reportes.
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          <ABMPage
            title=""
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por propiedad o captador..."
            loading={false}
            isEmpty={!loading && filtered.length === 0}
            buttonLabel="Nueva autorización"
            onAdd={() => toast.info('Alta de autorización: pendiente (demo)')}
          >
            {loading ? (
              <SkeletonTable rows={8} cols={7} />
            ) : (
              <ABMTable
                data={filtered}
                columns={columns}
                keyExtractor={(a) => a.id}
              />
            )}
          </ABMPage>
        </div>
      </div>

      <AICoachPanel screen="autorizaciones" contextData={contextData} />
    </div>
  )
}
