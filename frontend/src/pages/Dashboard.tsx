import { useEffect, useMemo, useState } from 'react'
import { Users, Building2, Calendar, GitBranch, MessageSquare, TrendingUp, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { dashboardAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonKpiCard } from '../components/ui/Skeleton'
import type { DashboardResumen } from '../types'

const ETAPA_LABEL: Record<string, string> = {
  captado: 'Captado',
  publicado: 'Publicado',
  visita: 'Visita',
  reserva: 'Reserva',
  boleto: 'Boleto',
  escrituracion: 'Escritura',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buen día'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const ETAPA_COLOR: Record<string, string> = {
  captado:        'var(--text-secondary)',
  publicado:      'var(--color-blue)',
  visita:         'var(--color-accent)',
  reserva:        'var(--color-warning)',
  boleto:         'var(--color-flame)',
  escrituracion:  'var(--color-success)',
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const width = 60
  const height = 18
  const step = width / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ')
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(values.length - 1) * step} cy={height - ((values[values.length - 1] - min) / range) * height} r="2" fill={color} />
    </svg>
  )
}

function KpiCard({ icon: Icon, label, value, sub, trend, accent, feature }: {
  icon: any
  label: string
  value: string | number
  sub?: string
  trend?: number[]
  accent?: 'primary' | 'accent' | 'flame' | 'success'
  feature?: boolean
}) {
  const colors = {
    primary: 'var(--color-primary)',
    accent:  'var(--color-accent)',
    flame:   'var(--color-flame)',
    success: 'var(--color-success)',
  }
  const color = colors[accent ?? 'primary']

  if (feature) {
    return (
      <div
        className="relative overflow-hidden rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 50%, var(--navy-700) 100%)',
          color: '#fff',
          border: '1px solid var(--navy-700)',
        }}
      >
        <div
          className="pointer-events-none absolute -top-1/2 -right-[10%] w-1/2 h-[200%]"
          style={{ background: 'radial-gradient(ellipse, rgba(201,161,88,0.20), transparent 60%)' }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div
            className="flex-shrink-0 p-2 rounded-lg"
            style={{ backgroundColor: 'rgba(201,161,88,0.18)', color: 'var(--gold-400)' }}
          >
            <Icon className="h-5 w-5" />
          </div>
          {trend && <Sparkline values={trend} color="var(--gold-400)" />}
        </div>
        <div
          className="uppercase-label mt-3 relative"
          style={{ color: 'var(--gold-300)' }}
        >{label}</div>
        <div
          className="font-serif-display tnum leading-none mt-1 relative"
          style={{ fontSize: '40px', color: '#fff' }}
        >{value}</div>
        {sub && <div className="text-xs mt-1 relative" style={{ color: 'var(--gold-300)' }}>{sub}</div>}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex-shrink-0 p-2 rounded-lg"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend && <Sparkline values={trend} color={color} />}
      </div>
      <div className="uppercase-label mt-3">{label}</div>
      <div
        className="font-serif-display tnum leading-none mt-1"
        style={{ fontSize: '32px', color: 'var(--text-primary)' }}
      >{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardResumen | null>(null)
  const [ranking, setRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashboardAPI.resumen(), dashboardAPI.ranking()])
      .then(([r1, r2]) => { setData(r1.data); setRanking(r2.data) })
      .catch(() => toast.error('Error al cargar dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const contextData = useMemo(() => {
    if (!data) return {}
    return {
      rol_usuario: user?.role,
      kpis_hoy: {
        clientes_total: data.total_clientes,
        propiedades_total: data.total_propiedades,
        visitas_semana: data.visitas_semana,
        deals_abiertos: data.deals_abiertos,
        conv_hoy: data.conversaciones_hoy,
        meta_conv: data.meta_conversaciones,
      },
      pipeline_etapas: data.pipeline_etapas,
      cambios_7d: {},
    }
  }, [data, user])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard />
        </div>
      </div>
    )
  }
  if (!data) return null

  const pctMeta = Math.min(100, Math.round((data.conversaciones_hoy / Math.max(data.meta_conversaciones, 1)) * 100))
  const mockTrend = (base: number) => Array.from({ length: 7 }, (_, i) => base * (0.7 + 0.05 * i + Math.random() * 0.1))
  const totalPipeline = Object.values(data.pipeline_etapas).reduce((a, b) => a + b, 0)
  const maxEtapa = Math.max(...Object.values(data.pipeline_etapas), 1)

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <span className="eyebrow-line">
            Dashboard · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1
            className="font-serif-display leading-none m-0"
            style={{ fontSize: 'clamp(32px, 5vw, 44px)', color: 'var(--text-primary)' }}
          >
            {greeting()}, {user?.nombre}.
          </h1>
          <p className="text-sm flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
            {user?.role === 'vendedor' ? 'Tu resumen del día.' : 'Resumen general de la oficina.'}
            <span
              className="inline-flex items-center gap-2 px-3 h-7 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <span
                className="relative inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--color-success)' }}
              />
              {totalPipeline} deals abiertos
            </span>
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            feature
            icon={MessageSquare}
            label="Conversaciones hoy"
            value={`${data.conversaciones_hoy} / ${data.meta_conversaciones}`}
            sub={`${pctMeta}% de la meta`}
            trend={mockTrend(data.conversaciones_hoy)}
            accent={pctMeta >= 80 ? 'success' : pctMeta >= 50 ? 'accent' : 'flame'}
          />
          <KpiCard icon={Users} label="Clientes" value={data.total_clientes} trend={mockTrend(data.total_clientes)} accent="primary" />
          <KpiCard icon={Building2} label="Propiedades" value={data.total_propiedades} trend={mockTrend(data.total_propiedades)} accent="primary" />
          <KpiCard icon={Calendar} label="Visitas (7d)" value={data.visitas_semana} trend={mockTrend(data.visitas_semana)} accent="accent" />
        </div>

        {/* Pipeline por etapa */}
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <GitBranch className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
              Pipeline por etapa
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {totalPipeline} deals abiertos
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {['captado', 'publicado', 'visita', 'reserva', 'boleto', 'escrituracion'].map((etapa) => {
              const count = data.pipeline_etapas[etapa] ?? 0
              const pct = (count / maxEtapa) * 100
              return (
                <div
                  key={etapa}
                  className="rounded-lg border p-3"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {ETAPA_LABEL[etapa]}
                  </div>
                  <div className="text-2xl font-bold mt-1" style={{ color: ETAPA_COLOR[etapa] }}>{count}</div>
                  <div className="h-1 rounded mt-2" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: ETAPA_COLOR[etapa] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ranking */}
        {user?.role !== 'vendedor' && ranking.length > 0 && (
          <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
              <h2 className="font-semibold">Ranking de vendedores · últimos 30 días</h2>
            </div>
            <div className="space-y-2">
              {ranking.slice(0, 10).map((r, i) => {
                const pct = Math.min(100, Math.round((r.conversaciones_mes / (r.meta_conversaciones * 30)) * 100))
                return (
                  <div key={r.vendedor_id} className="flex items-center gap-3">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: i === 0 ? 'var(--color-accent)' : 'var(--bg-hover)',
                        color: i === 0 ? 'var(--color-primary)' : 'var(--text-primary)',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{r.nombre}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {r.conversaciones_mes} conv · {r.visitas_mes} visitas · {r.clientes_total} clientes
                      </div>
                    </div>
                    <div className="hidden sm:block flex-shrink-0 w-32">
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-right mt-0.5" style={{ color: 'var(--text-secondary)' }}>{pct}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <AICoachPanel screen="dashboard" contextData={contextData} />
    </div>
  )
}
