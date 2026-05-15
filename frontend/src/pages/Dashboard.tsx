import { useEffect, useMemo, useState } from 'react'
import {
  Users, Building2, Calendar, MessageSquare, Trophy, Clock,
  TrendingUp, Download, Sparkles, Flag, Flame, Phone, Award,
  ChevronRight, MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { dashboardAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonKpiCard } from '../components/ui/Skeleton'
import { ABMAvatarClassic } from '../components/ui/classic'
import type { DashboardResumen } from '../types'

/* ============================================================
   Mock data — usado cuando dashboardAPI devuelve 0 / vacío.
   ============================================================ */

interface TeamRow {
  id: string
  name: string
  initials: string
  role: string
  dmo: number
  wa: number
  visits: number
  leads: number
  status: 'online' | 'warn' | 'offline'
}

const MOCK_TEAM: TeamRow[] = [
  { id: 'ls', name: 'Lucía Sandoval',     initials: 'LS', role: 'Senior · 4 años',  dmo: 96, wa: 62, visits: 8, leads: 31, status: 'online'  },
  { id: 'mc', name: 'Martín Cravero',     initials: 'MC', role: 'Senior · 6 años',  dmo: 94, wa: 58, visits: 6, leads: 28, status: 'online'  },
  { id: 'fr', name: 'Florencia Reig',     initials: 'FR', role: 'Mid · 2 años',     dmo: 88, wa: 51, visits: 5, leads: 24, status: 'online'  },
  { id: 'ds', name: 'Diego Sosa',         initials: 'DS', role: 'Mid · 3 años',     dmo: 82, wa: 47, visits: 7, leads: 22, status: 'online'  },
  { id: 'ci', name: 'Camila Iturri',      initials: 'CI', role: 'Mid · 2 años',     dmo: 78, wa: 44, visits: 4, leads: 19, status: 'online'  },
  { id: 'ab', name: 'Andrés Bertelli',    initials: 'AB', role: 'Senior · 5 años',  dmo: 74, wa: 39, visits: 5, leads: 18, status: 'warn'    },
  { id: 'mo', name: 'Mariano Ottonello',  initials: 'MO', role: 'Junior · 1 año',   dmo: 71, wa: 42, visits: 3, leads: 14, status: 'online'  },
  { id: 'sp', name: 'Sofía Pellegrini',   initials: 'SP', role: 'Junior · 8 meses', dmo: 68, wa: 38, visits: 3, leads: 12, status: 'online'  },
  { id: 'eq', name: 'Esteban Quattrocchio', initials: 'EQ', role: 'Mid · 3 años',   dmo: 62, wa: 31, visits: 4, leads: 16, status: 'warn'    },
  { id: 'vd', name: 'Valentina Decuzzi',  initials: 'VD', role: 'Junior · 6 meses', dmo: 58, wa: 34, visits: 2, leads:  9, status: 'online'  },
  { id: 'jl', name: 'Juan Pedro Larruzea', initials: 'JL', role: 'Junior · 4 meses', dmo: 41, wa: 22, visits: 1, leads:  7, status: 'offline' },
]

const MOCK_ALERTS = [
  { icon: Flag,  tone: 'danger'  as const, title: '3 autorizaciones vencen esta semana', sub: 'Bertelli, Sosa, Pellegrini · acción requerida' },
  { icon: Flame, tone: 'warning' as const, title: 'Larruzea con 38% DMO los últimos 7 días', sub: 'Pedir 1:1 con su coach (M. Cravero)' },
  { icon: Phone, tone: 'info'    as const, title: '22 leads sin responder hace 4h+',         sub: 'Promedio del equipo: 2h 14m' },
  { icon: Award, tone: 'success' as const, title: 'Sandoval cerró USD 245K esta semana',     sub: 'Tercer cierre del mes — récord personal' },
]

const MOCK_FUNNEL = [
  { label: 'Leads',       count: 487, width: 100, color: 'navy', pct: '100%' },
  { label: 'Calificados', count: 312, width: 78,  color: 'navy', pct: '64%'  },
  { label: 'Visitas',     count: 142, width: 55,  color: 'navy', pct: '29%'  },
  { label: 'Reservas',    count: 38,  width: 32,  color: 'gold', pct: '7.8%' },
  { label: 'Cierres',     count: 11,  width: 18,  color: 'gold', pct: '2.3%' },
]

const MOCK_PROXIMAS = [
  { tag: 'reserva', tone: 'gold' as const, name: 'Familia Vázquez',  prop: 'Av. Libertador 4820 · 3°B',  agent: 'L. Sandoval', amt: 'USD 245.000', when: 'firma sáb 11:00' },
  { tag: 'cierre',  tone: 'navy' as const, name: 'Pereyra / Ríos',   prop: 'Vidal 1944 · PH',            agent: 'M. Cravero',  amt: 'USD 198.000', when: 'escritura mar 20' },
  { tag: 'reserva', tone: 'gold' as const, name: 'Estudio Vrancken', prop: 'Núñez · comercial',          agent: 'F. Reig',     amt: 'USD 320.000', when: 'propuesta vier 15' },
]

const MOCK_HEATMAP = {
  days: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  rows: [
    { label: '08–10', row: [2, 3, 3, 4, 3, 1, 0] },
    { label: '10–12', row: [3, 4, 4, 4, 4, 2, 0] },
    { label: '12–14', row: [2, 2, 2, 3, 2, 1, 0] },
    { label: '14–16', row: [3, 3, 4, 4, 4, 3, 1] },
    { label: '16–18', row: [4, 4, 3, 4, 4, 3, 1] },
    { label: '18–20', row: [3, 3, 3, 3, 3, 2, 1] },
  ],
}

/* ============================================================
   Subcomponentes
   ============================================================ */

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const width = 80
  const height = 28
  const step = width / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')
  const lastY = height - ((values[values.length - 1] - min) / range) * (height - 4) - 2
  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={lastY} r="2.5" fill={color} />
    </svg>
  )
}

function MetricCard({ feature, label, value, suffix, sub, delta, deltaState, spark }: {
  feature?: boolean
  label: string
  value: string
  suffix?: string
  sub?: string
  delta?: string
  deltaState?: 'up' | 'dn' | 'flat'
  spark?: number[]
}) {
  if (feature) {
    return (
      <div
        className="relative overflow-hidden rounded-xl p-5 flex flex-col gap-1"
        style={{
          background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 50%, var(--navy-700) 100%)',
          color: '#fff',
          border: '1px solid var(--navy-700)',
          minHeight: 148,
        }}
      >
        <div
          className="pointer-events-none absolute -top-1/2 -right-[10%] w-1/2 h-[200%]"
          style={{ background: 'radial-gradient(ellipse, rgba(201,161,88,0.20), transparent 60%)' }}
        />
        <div className="uppercase-label relative" style={{ color: 'var(--gold-300)' }}>
          {label}
        </div>
        <div
          className="font-serif-display tnum leading-none relative"
          style={{ fontSize: 44, color: '#fff', letterSpacing: '-0.02em' }}
        >
          {value}
          {suffix && (
            <em
              style={{ fontStyle: 'normal', color: 'var(--gold-400)', fontSize: 22, marginLeft: 4 }}
            >
              {suffix}
            </em>
          )}
        </div>
        {delta && (
          <span
            className="relative inline-flex items-center gap-1 self-start font-mono-tnum text-[11px] font-semibold px-2 py-0.5 rounded mt-1"
            style={{
              backgroundColor: 'rgba(45, 125, 90, 0.22)',
              color: 'var(--gold-300)',
            }}
          >
            <TrendingUp className="h-3 w-3" />
            {delta}
          </span>
        )}
        {sub && <div className="text-xs relative mt-1" style={{ color: 'var(--gold-300)' }}>{sub}</div>}
        {spark && (
          <div className="absolute" style={{ right: 16, bottom: 14 }}>
            <Sparkline values={spark} color="var(--gold-400)" />
          </div>
        )}
      </div>
    )
  }

  const deltaBg =
    deltaState === 'up' ? 'var(--color-success-bg)' :
    deltaState === 'dn' ? 'rgba(181, 58, 58, 0.10)'  :
    'var(--navy-50)'
  const deltaColor =
    deltaState === 'up' ? 'var(--color-success)' :
    deltaState === 'dn' ? 'var(--color-danger)'  :
    'var(--ink-4)'

  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 flex flex-col gap-1 transition-all duration-200 hover:-translate-y-px"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)',
        minHeight: 148,
      }}
    >
      <div className="uppercase-label">{label}</div>
      <div
        className="font-serif-display tnum leading-none"
        style={{ fontSize: 44, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
      {delta && (
        <span
          className="inline-flex items-center gap-1 self-start font-mono-tnum text-[11px] font-semibold px-2 py-0.5 rounded mt-1"
          style={{ backgroundColor: deltaBg, color: deltaColor }}
        >
          <TrendingUp className="h-3 w-3" />
          {delta}
        </span>
      )}
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
      {spark && (
        <div className="absolute" style={{ right: 16, bottom: 14 }}>
          <Sparkline values={spark} color="var(--navy-600)" />
        </div>
      )}
    </div>
  )
}

function Panel({ title, subtitle, headerExtra, children, bodyPadded = true }: {
  title: string
  subtitle?: string
  headerExtra?: React.ReactNode
  children: React.ReactNode
  bodyPadded?: boolean
}) {
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div
        className="flex items-baseline justify-between gap-4 px-6 py-4"
        style={{ borderBottom: '1px solid var(--divider)' }}
      >
        <h3
          className="font-serif-display m-0 flex items-baseline gap-2.5"
          style={{ fontSize: 22, color: 'var(--text-primary)', letterSpacing: '-0.01em', fontWeight: 400 }}
        >
          {title}
          {subtitle && (
            <em
              className="uppercase font-mono-tnum"
              style={{
                fontStyle: 'normal',
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                letterSpacing: '0.14em',
                color: 'var(--ink-4)',
                fontWeight: 600,
              }}
            >
              {subtitle}
            </em>
          )}
        </h3>
        {headerExtra}
      </div>
      <div className={bodyPadded ? 'px-6 py-5' : ''}>
        {children}
      </div>
    </div>
  )
}

function TabPill({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center h-8 px-3 rounded-full text-xs font-medium transition-colors"
      style={{
        backgroundColor: active ? 'var(--surface)' : 'transparent',
        border: `1px solid ${active ? 'var(--border-strong)' : 'transparent'}`,
        color: active ? 'var(--text-primary)' : 'var(--ink-4)',
      }}
    >
      {children}
    </button>
  )
}

function TeamTable({ team }: { team: TeamRow[] }) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse" style={{ minWidth: 720 }}>
      <thead>
        <tr>
          <th className="uppercase-label py-3 pl-6 pr-4 text-left" style={{ borderBottom: '1px solid var(--divider)' }}>Agente</th>
          <th className="uppercase-label py-3 px-4 text-left" style={{ borderBottom: '1px solid var(--divider)' }}>Estado</th>
          <th className="uppercase-label py-3 px-4 text-left" style={{ borderBottom: '1px solid var(--divider)' }}>DMO 7d</th>
          <th className="uppercase-label py-3 px-4 text-right" style={{ borderBottom: '1px solid var(--divider)' }}>Conv.</th>
          <th className="uppercase-label py-3 px-4 text-right" style={{ borderBottom: '1px solid var(--divider)' }}>Visitas</th>
          <th className="uppercase-label py-3 px-4 text-right" style={{ borderBottom: '1px solid var(--divider)' }}>Leads</th>
          <th className="py-3 pr-6" style={{ borderBottom: '1px solid var(--divider)' }} />
        </tr>
      </thead>
      <tbody>
        {team.map((a) => {
          const barColor =
            a.dmo >= 80 ? 'var(--color-success)' :
            a.dmo >= 60 ? 'var(--gold-500)'      :
            a.dmo >= 40 ? 'var(--color-warning)' :
            'var(--color-danger)'
          const dotColor =
            a.status === 'online' ? 'var(--color-success)' :
            a.status === 'warn'   ? 'var(--color-warning)' :
            'var(--ink-6)'
          const statusLabel = a.status === 'online' ? 'Activo' : a.status === 'warn' ? 'Atrasado' : 'Offline'
          return (
            <tr
              key={a.id}
              style={{ borderBottom: '1px solid var(--divider)' }}
              className="transition-colors"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-3)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
            >
              <td className="py-3 pl-6 pr-4">
                <div className="flex items-center gap-3">
                  <ABMAvatarClassic initials={a.initials} size="sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{a.name}</div>
                    <div className="text-xs leading-tight" style={{ color: 'var(--ink-4)' }}>{a.role}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-2)' }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                  {statusLabel}
                </span>
              </td>
              <td className="py-3 px-4" style={{ minWidth: 160 }}>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--warm-200)' }}>
                  <div className="h-full rounded-full" style={{ width: `${a.dmo}%`, backgroundColor: barColor }} />
                </div>
                <div className="font-mono-tnum text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>{a.dmo}%</div>
              </td>
              <td className="py-3 px-4 font-mono-tnum text-right" style={{ color: 'var(--text-primary)' }}>{a.wa}</td>
              <td className="py-3 px-4 font-mono-tnum text-right" style={{ color: 'var(--text-primary)' }}>{a.visits}</td>
              <td className="py-3 px-4 font-mono-tnum text-right" style={{ color: 'var(--text-primary)' }}>{a.leads}</td>
              <td className="py-3 pr-6 text-right">
                <ChevronRight className="h-4 w-4 inline-block" style={{ color: 'var(--ink-5)' }} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
  )
}

function Funnel({ stages }: { stages: typeof MOCK_FUNNEL }) {
  return (
    <div className="flex flex-col gap-2">
      {stages.map((s, i) => (
        <div key={i} className="grid items-center gap-3.5" style={{ gridTemplateColumns: '90px 1fr 60px' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>{s.label}</div>
          <div
            className="h-8 rounded flex items-center pl-3"
            style={{
              width: `${s.width}%`,
              background: s.color === 'gold'
                ? 'linear-gradient(90deg, var(--gold-600), var(--gold-500))'
                : 'linear-gradient(90deg, var(--navy-800), var(--navy-600))',
              color: s.color === 'gold' ? 'var(--navy-900)' : '#fff',
            }}
          >
            <span className="font-mono-tnum text-xs font-semibold">{s.count.toLocaleString('es-AR')}</span>
          </div>
          <div className="font-mono-tnum text-xs text-right" style={{ color: 'var(--ink-4)' }}>{s.pct}</div>
        </div>
      ))}
    </div>
  )
}

function AlertsList() {
  return (
    <div className="flex flex-col">
      {MOCK_ALERTS.map((it, i) => {
        const bg =
          it.tone === 'danger'  ? 'rgba(239, 68, 68, 0.10)' :
          it.tone === 'warning' ? 'rgba(245, 158, 11, 0.12)' :
          it.tone === 'info'    ? 'rgba(47, 90, 149, 0.10)' :
          'var(--color-success-bg)'
        const fg =
          it.tone === 'danger'  ? 'var(--color-danger)'  :
          it.tone === 'warning' ? 'var(--color-warning)' :
          it.tone === 'info'    ? 'var(--navy-600)'      :
          'var(--color-success)'
        const Icon = it.icon
        return (
          <div
            key={i}
            className="grid items-start gap-3.5 py-3.5"
            style={{
              gridTemplateColumns: '32px 1fr',
              borderTop: i ? '1px solid var(--divider)' : 'none',
            }}
          >
            <div
              className="w-8 h-8 rounded-full grid place-items-center"
              style={{ backgroundColor: bg, color: fg }}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--ink-1)' }}>{it.title}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>{it.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Heatmap() {
  return (
    <div>
      <div className="grid gap-1 font-mono-tnum text-[10.5px]" style={{ gridTemplateColumns: '48px repeat(7, 1fr)', color: 'var(--ink-5)' }}>
        <span />
        {MOCK_HEATMAP.days.map((d, i) => <span key={i} className="text-center">{d}</span>)}
      </div>
      {MOCK_HEATMAP.rows.map((h, i) => (
        <div key={i} className="grid gap-1 mt-1 font-mono-tnum text-[10.5px]" style={{ gridTemplateColumns: '48px repeat(7, 1fr)', color: 'var(--ink-5)' }}>
          <span className="flex items-center">{h.label}</span>
          {h.row.map((lvl, j) => {
            const bg =
              lvl === 0 ? 'var(--warm-200)' :
              lvl === 1 ? 'var(--navy-100)' :
              lvl === 2 ? 'var(--navy-300)' :
              lvl === 3 ? 'var(--navy-600)' :
              'var(--navy-800)'
            return (
              <span
                key={j}
                title={`${h.label} · ${MOCK_HEATMAP.days[j]}: nivel ${lvl}`}
                className="rounded-[3px]"
                style={{ backgroundColor: bg, aspectRatio: '1.6 / 1' }}
              />
            )
          })}
        </div>
      ))}
      <div
        className="mt-4 flex items-center gap-2 font-mono-tnum text-[11px]"
        style={{ color: 'var(--ink-4)' }}
      >
        <span>Menos</span>
        {['var(--warm-200)', 'var(--navy-100)', 'var(--navy-300)', 'var(--navy-600)', 'var(--navy-800)'].map((c, i) => (
          <span key={i} className="rounded-[2px]" style={{ width: 14, height: 10, backgroundColor: c }} />
        ))}
        <span>Más</span>
      </div>
    </div>
  )
}

/* ============================================================
   Dashboard
   ============================================================ */

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buen día'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardResumen | null>(null)
  const [_ranking, setRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'7d' | '30d' | 'tri'>('7d')

  useEffect(() => {
    Promise.all([dashboardAPI.resumen(), dashboardAPI.ranking()])
      .then(([r1, r2]) => { setData(r1.data); setRanking(r2.data) })
      .catch(() => toast.error('Error al cargar dashboard'))
      .finally(() => setLoading(false))
  }, [])

  // Si la API responde con todo en 0, activamos los mocks visuales
  const usingMock = useMemo(() => {
    if (!data) return false
    return (
      (data.conversaciones_hoy ?? 0) === 0 &&
      (data.total_clientes     ?? 0) === 0 &&
      (data.total_propiedades  ?? 0) === 0 &&
      (data.visitas_semana     ?? 0) === 0
    )
  }, [data])

  const kpis = useMemo(() => {
    if (!data) return null
    if (usingMock) {
      return {
        opsMonthValue: 'USD 1,45', opsMonthSuffix: 'M', opsMonthSub: '4 cierres · meta USD 2,1M (69%)', opsMonthDelta: '+34% vs. abr', opsMonthSpark: [0.4, 0.5, 0.45, 0.55, 0.65, 0.8, 1, 1.45],
        convValue:    '487',                              convSub:    'meta 420 · 11 agentes',         convDelta:    '+16% vs. promedio', convSpark:    [58, 62, 71, 68, 75, 82, 71],
        visitsValue:  '38',                               visitsSub:  'esta semana · 6 hoy',           visitsDelta:  '+5 vs. sem. pasada', visitsSpark: [28, 31, 33, 30, 34, 36, 38],
        tiempoValue:  '2h 14m',                           tiempoSub:  'primer contacto a lead WhatsApp', tiempoDelta: '−18% vs. promedio', tiempoSpark: [3.4, 3.1, 2.9, 2.7, 2.5, 2.3, 2.2],
      }
    }
    const pctMeta = Math.min(100, Math.round((data.conversaciones_hoy / Math.max(data.meta_conversaciones, 1)) * 100))
    const mockTrend = (base: number) => Array.from({ length: 7 }, (_, i) => base * (0.7 + 0.05 * i + Math.random() * 0.1))
    return {
      opsMonthValue: `${data.conversaciones_hoy}`, opsMonthSuffix: ` / ${data.meta_conversaciones}`, opsMonthSub: `${pctMeta}% de la meta`, opsMonthDelta: undefined as string | undefined, opsMonthSpark: mockTrend(data.conversaciones_hoy || 1),
      convValue:    `${data.total_clientes}`,    convSub:    'clientes en cartera',                  convDelta:    undefined as string | undefined, convSpark:    mockTrend(data.total_clientes || 1),
      visitsValue:  `${data.total_propiedades}`, visitsSub:  'propiedades publicadas',               visitsDelta:  undefined as string | undefined, visitsSpark: mockTrend(data.total_propiedades || 1),
      tiempoValue:  `${data.visitas_semana}`,    tiempoSub:  'visitas en los próximos 7 días',       tiempoDelta:  undefined as string | undefined, tiempoSpark: mockTrend(data.visitas_semana || 1),
    }
  }, [data, usingMock])

  const totalPipeline = useMemo(() => {
    if (!data) return 0
    if (usingMock) return MOCK_FUNNEL[0].count
    return Object.values(data.pipeline_etapas).reduce((a, b) => a + b, 0)
  }, [data, usingMock])

  const contextData = useMemo(() => {
    if (!data) return {}
    return {
      rol_usuario: user?.role,
      using_mock: usingMock,
      kpis_hoy: {
        clientes_total: data.total_clientes,
        propiedades_total: data.total_propiedades,
        visitas_semana: data.visitas_semana,
        deals_abiertos: data.deals_abiertos,
        conv_hoy: data.conversaciones_hoy,
        meta_conv: data.meta_conversaciones,
      },
      pipeline_etapas: data.pipeline_etapas,
    }
  }, [data, user, usingMock])

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="h-8 w-64 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard />
        </div>
      </div>
    )
  }
  if (!data || !kpis) return null

  const displayName = user?.nombre ?? 'Patricio'
  const pctCompletitud = usingMock ? 74 : Math.round((data as any).pct_completitud_promedio ?? 0)
  const agentesActivos = usingMock ? '9 de 11' : '—'

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* ===== Header ===== */}
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <div className="flex flex-col gap-2 min-w-0">
            <span className="eyebrow-line">
              Dashboard · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <h1
              className="font-serif-display leading-none m-0"
              style={{ fontSize: 'clamp(32px, 5vw, 44px)', color: 'var(--text-primary)' }}
            >
              {greeting()}, {displayName}.
            </h1>
            <p className="text-sm flex items-center gap-2 flex-wrap m-0" style={{ color: 'var(--ink-3)' }}>
              Tu equipo lleva{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{pctCompletitud}% de completitud DMO</strong>
              {' '}esta semana.
              <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--ink-5)' }} />
              <span
                className="inline-flex items-center gap-2 px-3 h-7 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <span className="relative inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                {agentesActivos} agentes activos ahora
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--border-color)' }}
            >
              <Calendar className="h-4 w-4" /> Esta semana
            </button>
            <button
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--border-color)' }}
            >
              <Download className="h-4 w-4" /> Reporte
            </button>
            <button
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: 'var(--navy-800)', color: '#fff', border: '1px solid var(--navy-800)' }}
            >
              <Sparkles className="h-4 w-4" /> Coach sesión 1:1
            </button>
          </div>
        </div>

        {/* ===== 4 KPI cards ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            feature
            label={usingMock ? 'Operaciones del mes' : 'Conversaciones hoy'}
            value={kpis.opsMonthValue}
            suffix={kpis.opsMonthSuffix}
            sub={kpis.opsMonthSub}
            delta={kpis.opsMonthDelta}
            deltaState="up"
            spark={kpis.opsMonthSpark}
          />
          <MetricCard
            label={usingMock ? 'Conversaciones 7d' : 'Clientes'}
            value={kpis.convValue}
            sub={kpis.convSub}
            delta={kpis.convDelta}
            deltaState="up"
            spark={kpis.convSpark}
          />
          <MetricCard
            label={usingMock ? 'Visitas agendadas' : 'Propiedades'}
            value={kpis.visitsValue}
            sub={kpis.visitsSub}
            delta={kpis.visitsDelta}
            deltaState="up"
            spark={kpis.visitsSpark}
          />
          <MetricCard
            label={usingMock ? 'Tiempo de respuesta' : 'Visitas (7d)'}
            value={kpis.tiempoValue}
            sub={kpis.tiempoSub}
            delta={kpis.tiempoDelta}
            deltaState="up"
            spark={kpis.tiempoSpark}
          />
        </div>

        {/* ===== Performance equipo + Pipeline funnel + Atención ===== */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
          <Panel
            title="Performance del equipo"
            subtitle={`${MOCK_TEAM.length} agentes`}
            bodyPadded={false}
            headerExtra={
              <div className="flex items-center gap-1">
                <TabPill active={tab === '7d'}  onClick={() => setTab('7d')}>7 días</TabPill>
                <TabPill active={tab === '30d'} onClick={() => setTab('30d')}>30 días</TabPill>
                <TabPill active={tab === 'tri'} onClick={() => setTab('tri')}>Trimestre</TabPill>
              </div>
            }
          >
            <TeamTable team={MOCK_TEAM} />
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel
              title="Pipeline"
              subtitle="esta semana"
              headerExtra={
                <button
                  className="p-1.5 rounded transition-colors"
                  style={{ color: 'var(--ink-4)' }}
                  title="Más opciones"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            >
              <Funnel stages={MOCK_FUNNEL} />
              <div
                className="flex items-center justify-between mt-4 pt-3.5 text-[11.5px]"
                style={{ borderTop: '1px solid var(--divider)', color: 'var(--ink-4)' }}
              >
                <span>Conversión lead → cierre: <strong style={{ color: 'var(--text-primary)' }}>2.3%</strong></span>
                <span>Meta: <strong style={{ color: 'var(--text-primary)' }}>3.0%</strong></span>
              </div>
            </Panel>

            <Panel title="Atención" subtitle="4 alertas">
              <AlertsList />
            </Panel>
          </div>
        </div>

        {/* ===== Heatmap + Próximas operaciones ===== */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="Actividad del equipo" subtitle="conversaciones · 7 días">
            <Heatmap />
          </Panel>

          <Panel title="Próximas operaciones" subtitle={`${MOCK_PROXIMAS.length} en agenda`}>
            <div className="flex flex-col">
              {MOCK_PROXIMAS.map((r, i) => (
                <div
                  key={i}
                  className="grid items-center gap-3.5 py-3.5"
                  style={{
                    gridTemplateColumns: '80px 1fr auto',
                    borderTop: i ? '1px solid var(--divider)' : 'none',
                  }}
                >
                  <span
                    className="uppercase font-bold text-center"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      padding: '3px 8px',
                      borderRadius: 3,
                      backgroundColor: r.tone === 'gold' ? 'var(--gold-500)' : 'var(--navy-800)',
                      color: r.tone === 'gold' ? 'var(--navy-900)' : '#fff',
                    }}
                  >
                    {r.tag}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {r.name}
                      <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--ink-4)' }}>· {r.agent}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>{r.prop}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-serif-display tnum"
                      style={{ fontSize: 18, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}
                    >
                      {r.amt}
                    </div>
                    <div className="font-mono-tnum text-[11px] mt-0.5" style={{ color: 'var(--ink-5)' }}>{r.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <AICoachPanel screen="dashboard" contextData={contextData} />
    </div>
  )
}
