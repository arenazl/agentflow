import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, Check, Flame, Clock, GraduationCap, AlertCircle, Calendar as CalendarIcon, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { dmoAPI } from '../services/api'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonDMOBlock, SkeletonKpiCard } from '../components/ui/Skeleton'
import type { DmoDia, DmoBloque, DmoLog } from '../types'

function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}

function ahoraHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

type BlockStatus = 'done' | 'now' | 'pending' | 'overdue'

function getStatus(b: DmoBloque, log: { completado: boolean } | undefined, nowMin: number): BlockStatus {
  const ini = hhmmToMin(b.hora_inicio.slice(0, 5))
  const fin = hhmmToMin(b.hora_fin.slice(0, 5))
  if (log?.completado) return 'done'
  if (nowMin >= ini && nowMin < fin) return 'now'
  if (nowMin >= fin) return 'overdue'
  return 'pending'
}

const STATUS_COLOR: Record<BlockStatus, string> = {
  done:    'var(--color-success)',
  now:     'var(--color-accent)',
  pending: 'var(--text-secondary)',
  overdue: 'var(--color-flame)',
}

export function DMO() {
  const [data, setData] = useState<DmoDia | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(ahoraHHMM())
  const fecha = fechaHoy()

  const load = async () => {
    try {
      const r = await dmoAPI.dia(fecha)
      setData(r.data)
    } catch { toast.error('Error al cargar DMO') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const t = setInterval(() => setNow(ahoraHHMM()), 60_000)
    return () => clearInterval(t)
  }, [])

  const toggleBloque = async (bloque: DmoBloque, completado: boolean, valor: number) => {
    try {
      await dmoAPI.log({
        bloque_id: bloque.id,
        fecha,
        completado,
        valor_metrica: valor,
        notas: null,
      })
      toast.success(completado ? `${bloque.nombre}: completado` : `${bloque.nombre}: desmarcado`)
      load()
    } catch { toast.error('Error al guardar') }
  }

  const logsByBloque = useMemo(() => {
    const m = new Map<number, DmoLog>()
    data?.logs.forEach((l) => m.set(l.bloque_id, l))
    return m
  }, [data])

  const nowMin = hhmmToMin(now)

  const blockStatuses = useMemo(() => {
    if (!data) return []
    return data.bloques.map((b) => ({
      bloque: b,
      status: getStatus(b, logsByBloque.get(b.id), nowMin),
      log: logsByBloque.get(b.id),
    }))
  }, [data, logsByBloque, nowMin])

  const contextData = useMemo(() => {
    if (!data) return {}
    const bloquesCtx = data.bloques.map((b) => {
      const log = logsByBloque.get(b.id)
      return {
        id: b.id,
        nombre: b.nombre,
        hora_inicio: b.hora_inicio.slice(0, 5),
        hora_fin: b.hora_fin.slice(0, 5),
        es_money_block: b.es_money_block,
        metrica_tipo: b.metrica_tipo,
        metrica_label: b.metrica_label,
        metrica_meta: b.metrica_meta,
        valor_actual: log?.valor_metrica ?? 0,
        completado: !!log?.completado,
        estado: getStatus(b, log, nowMin),
      }
    })
    const actual = bloquesCtx.find((b) => b.estado === 'now') || null
    const sig = bloquesCtx.find((b) => hhmmToMin(b.hora_inicio) > nowMin) || null
    const vencidosNoCompletados = bloquesCtx.filter((b) => b.estado === 'overdue').map((b) => b.nombre)
    return {
      template: data.template
        ? { nombre: data.template.nombre, coach: data.template.coach_nombre, mercado: data.template.mercado }
        : null,
      hora: now,
      fecha,
      meta_conversaciones_diaria: data.conversaciones_meta,
      conv_hoy: data.conversaciones_realizadas,
      pct_completitud: data.pct_completitud,
      bloques: bloquesCtx,
      bloque_actual: actual,
      siguiente_bloque: sig
        ? { id: sig.id, nombre: sig.nombre, hora_inicio: sig.hora_inicio, metrica_label: sig.metrica_label }
        : null,
      bloques_completados_count: bloquesCtx.filter((b) => b.completado).length,
      bloques_vencidos_no_completados: vencidosNoCompletados,
    }
  }, [data, logsByBloque, now, nowMin, fecha])

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 space-y-6 p-4 md:p-6">
        <div>
          <div className="h-8 w-64 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonDMOBlock key={i} />)}
        </div>
      </div>
    )
  }
  if (!data) return null

  // Vendedor sin template: empty state
  if (!data.template) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 mb-3" style={{ color: 'var(--color-flame)' }} />
        <h2 className="text-xl font-bold mb-2">No tenés un DMO asignado todavia</h2>
        <p className="text-sm mb-4 max-w-md" style={{ color: 'var(--text-secondary)' }}>
          Pedile a tu gerente que te asigne una metodologia (Beyker AR, Tom Ferry, Buffini, etc.)
          o que cargue el template default de la oficina.
        </p>
        <Link
          to="/asignaciones-dmo"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Ir a asignaciones
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Header editorial CB */}
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <div className="flex flex-col gap-2 min-w-0">
            <span className="eyebrow-line">
              Mi DMO · {new Date(fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <h1
              className="font-serif-display leading-none m-0"
              style={{ fontSize: 'clamp(32px, 5vw, 44px)', color: 'var(--text-primary)' }}
            >
              Mi DMO de hoy
            </h1>
            <p className="text-sm flex items-center gap-2 flex-wrap m-0" style={{ color: 'var(--ink-3)' }}>
              <span className="font-mono-tnum">{now}</span>
              <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--ink-5)' }} />
              <span
                className="inline-flex items-center gap-2 px-3 h-7 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <GraduationCap className="h-3.5 w-3.5" style={{ color: 'var(--gold-600)' }} />
                <strong style={{ fontWeight: 600 }}>{data.template.nombre}</strong>
                {data.template.coach_nombre && <span style={{ color: 'var(--ink-4)' }}>· {data.template.coach_nombre}</span>}
              </span>
              <span
                className="inline-flex items-center gap-2 px-3 h-7 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <span className="relative inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                <strong style={{ fontWeight: 600 }}>{data.logs.filter((l) => l.completado).length} de {data.bloques.length}</strong>
                <span style={{ color: 'var(--ink-4)' }}>bloques · {data.pct_completitud}% completitud</span>
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--border-color)' }}
              onClick={() => toast.info('Selector de día — próximamente')}
            >
              <CalendarIcon className="h-4 w-4" /> Cambiar día
            </button>
            <button
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: 'var(--navy-800)', color: '#fff', border: '1px solid var(--navy-800)' }}
              onClick={() => toast.info('Coach sesión 1:1 — próximamente')}
            >
              <Sparkles className="h-4 w-4" /> Coach sesión 1:1
            </button>
          </div>
        </div>

        {/* Timeline horizontal */}
        <TimelineHorizontal items={blockStatuses} nowMin={nowMin} />

        {/* Focus card: bloque en curso */}
        <FocusNowCard items={blockStatuses} logsByBloque={logsByBloque} nowMin={nowMin} />

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard
            label="Conversaciones hoy"
            value={`${data.conversaciones_realizadas} / ${data.conversaciones_meta}`}
            progress={Math.min(100, Math.round((data.conversaciones_realizadas / Math.max(data.conversaciones_meta, 1)) * 100))}
            accent={data.conversaciones_realizadas >= data.conversaciones_meta ? 'success' : (data.conversaciones_realizadas >= data.conversaciones_meta * 0.5 ? 'accent' : 'flame')}
          />
          <KpiCard
            label="Completitud DMO"
            value={`${data.pct_completitud}%`}
            progress={data.pct_completitud}
            accent="accent"
          />
          <KpiCard
            label="Bloques completados"
            value={`${data.logs.filter(l => l.completado).length} / ${data.bloques.length}`}
            progress={Math.round((data.logs.filter(l => l.completado).length / Math.max(data.bloques.length, 1)) * 100)}
            accent="accent"
          />
        </div>

        {/* Bloques dinamicos */}
        <div className="space-y-3">
          {blockStatuses.map(({ bloque: b, status, log }) => {
            const completado = !!log?.completado
            const valor = log?.valor_metrica ?? 0
            const color = STATUS_COLOR[status]
            const isMoneyBlock = b.es_money_block
            const hasMetric = b.metrica_tipo === 'cantidad'
            const metricLabel = b.metrica_label || 'Cantidad'

            return (
              <div
                key={b.id}
                id={`dmo-bloque-${b.id}`}
                className="relative rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 animate-fade-in-up scroll-mt-4"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: status === 'now' ? color : 'var(--border-color)',
                  boxShadow: status === 'now'
                    ? `0 0 0 1px ${color}, 0 0 32px ${isMoneyBlock ? 'var(--color-flame-bg)' : 'var(--border-glow)'}`
                    : 'none',
                }}
              >
                {/* Acento lateral */}
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: b.color || color }} />

                <div className="flex items-start gap-4 p-4 pl-5">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white"
                    style={{
                      background: isMoneyBlock
                        ? `linear-gradient(135deg, var(--color-flame), #c2410c)`
                        : `linear-gradient(135deg, ${b.color || color}, ${b.color || color}dd)`,
                    }}
                  >
                    {isMoneyBlock ? <Flame className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold">{b.nombre}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-mono"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                      >
                        {b.hora_inicio.slice(0, 5)} – {b.hora_fin.slice(0, 5)}
                      </span>
                      {isMoneyBlock && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ backgroundColor: 'var(--color-flame-bg)', color: 'var(--color-flame)' }}
                        >
                          No negociable
                        </span>
                      )}
                      {status === 'now' && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-bold animate-pulse-glow"
                          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}
                        >
                          LIVE
                        </span>
                      )}
                      {status === 'overdue' && !completado && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ backgroundColor: 'var(--color-flame-bg)', color: 'var(--color-flame)' }}
                        >
                          Vencido
                        </span>
                      )}
                      {status === 'done' && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1"
                          style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}
                        >
                          <Check className="h-3 w-3" /> Completado
                        </span>
                      )}
                    </div>
                    {b.descripcion && (
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {b.descripcion}
                      </p>
                    )}

                    {/* Barra de progreso si tiene metrica de cantidad */}
                    {hasMetric && b.metrica_meta > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span style={{ color: 'var(--text-secondary)' }}>{metricLabel} reportadas</span>
                          <span className="font-semibold">{valor} / {b.metrica_meta}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (valor / Math.max(b.metrica_meta, 1)) * 100)}%`,
                              background: isMoneyBlock
                                ? 'linear-gradient(90deg, var(--color-flame), var(--color-accent))'
                                : b.color || 'var(--color-accent)',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <button
                        onClick={() => toggleBloque(b, !completado, valor)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium active:scale-95 transition-all duration-200"
                        style={{
                          backgroundColor: completado ? 'var(--color-success-bg)' : 'transparent',
                          color: completado ? 'var(--color-success)' : 'var(--text-primary)',
                          border: `1px solid ${completado ? 'var(--color-success)' : 'var(--border-color)'}`,
                        }}
                      >
                        <Check className="h-4 w-4" />
                        {completado ? 'Completado' : 'Marcar completado'}
                      </button>
                      {hasMetric && (
                        <MetricaStepper
                          bloqueId={b.id}
                          serverValue={valor}
                          label={metricLabel}
                          onCommit={(next) => toggleBloque(b, completado, next)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AICoachPanel screen="dmo" contextData={contextData} />
    </div>
  )
}

function MetricaStepper({
  bloqueId, serverValue, label, onCommit,
}: {
  bloqueId: number
  serverValue: number
  label: string
  onCommit: (next: number) => void
}) {
  const [localVal, setLocalVal] = useState(serverValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBloqueRef = useRef(bloqueId)

  // Sincronizar con server cuando llega un valor nuevo del fetch
  // (pero NO durante el debounce — si hay timer pendiente, el local manda)
  useEffect(() => {
    if (debounceRef.current) return
    setLocalVal(serverValue)
  }, [serverValue, bloqueId])

  // Si el usuario cambia de bloque, resetear todo
  useEffect(() => {
    if (lastBloqueRef.current !== bloqueId) {
      lastBloqueRef.current = bloqueId
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
      setLocalVal(serverValue)
    }
  }, [bloqueId, serverValue])

  const scheduleCommit = (next: number) => {
    setLocalVal(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      onCommit(next)
    }, 400)
  }

  const bump = (delta: number) => scheduleCommit(Math.max(0, localVal + delta))
  const setExact = (raw: string) => {
    const n = parseInt(raw.replace(/[^0-9]/g, ''), 10)
    scheduleCommit(Number.isFinite(n) && n >= 0 ? n : 0)
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="inline-flex items-stretch rounded-lg border overflow-hidden h-9 select-none"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-app)' }}
      >
        <button
          type="button"
          onClick={() => bump(-1)}
          aria-label="Restar"
          className="w-9 flex items-center justify-center text-base font-semibold hover:bg-[var(--bg-hover)] active:scale-95 transition-all duration-150"
          style={{ color: 'var(--text-primary)' }}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localVal}
          onChange={(e) => setExact(e.target.value)}
          className="w-12 text-center font-semibold bg-transparent focus:outline-none border-x"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={() => bump(1)}
          aria-label="Sumar"
          className="w-9 flex items-center justify-center text-base font-semibold hover:bg-[var(--bg-hover)] active:scale-95 transition-all duration-150"
          style={{ color: 'var(--text-primary)' }}
        >
          +
        </button>
      </div>
      {label && (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {label.toLowerCase()}
        </span>
      )}
    </div>
  )
}

function KpiCard({ label, value, progress, accent }: { label: string; value: string; progress: number; accent: 'success' | 'accent' | 'flame' }) {
  const colors: Record<typeof accent, string> = {
    success: 'var(--color-success)',
    accent:  'var(--color-accent)',
    flame:   'var(--color-flame)',
  }
  const color = colors[accent]
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="text-2xl font-bold mb-2" style={{ color }}>{value}</div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function TimelineHorizontal({
  items, nowMin,
}: {
  items: { bloque: DmoBloque; status: string }[]
  nowMin: number
}) {
  if (!items.length) return null

  const start = hhmmToMin(items[0].bloque.hora_inicio.slice(0, 5))
  const end = hhmmToMin(items[items.length - 1].bloque.hora_fin.slice(0, 5))
  const range = end - start || 1
  const nowInRange = nowMin >= start && nowMin <= end
  const nowPct = Math.max(0, Math.min(100, ((nowMin - start) / range) * 100))
  const nowLabel = `${String(Math.floor(nowMin / 60)).padStart(2, '0')}:${String(nowMin % 60).padStart(2, '0')}`

  const scrollToBlock = (id: number) => {
    const el = document.getElementById(`dmo-bloque-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Padding lateral interno para que los nodos extremos no se corten
  const PAD_PCT = 4 // 4% a cada lado

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="eyebrow-line">Línea del día</span>
        <div className="flex items-center gap-3 text-[10px] font-mono-tnum">
          <LegendDot color="var(--color-success)" label="Completado" />
          <LegendDot color="var(--color-accent)" label="En curso" />
          <LegendDot color="var(--color-flame)" label="Vencido" />
          <LegendDot color="var(--text-secondary)" label="Pendiente" />
        </div>
      </div>

      {/* Track */}
      <div className="relative h-24" style={{ paddingLeft: `${PAD_PCT}%`, paddingRight: `${PAD_PCT}%` }}>
        <div className="relative h-full">
          {/* Línea base gris */}
          <div
            className="absolute left-0 right-0 top-6 h-[3px] rounded-full"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          />
          {/* Línea de progreso (de start hasta now) en gold */}
          {nowInRange && (
            <div
              className="absolute left-0 top-6 h-[3px] rounded-full"
              style={{
                width: `${nowPct}%`,
                background: 'linear-gradient(90deg, var(--color-success), var(--color-accent))',
                boxShadow: '0 0 8px var(--border-glow)',
              }}
            />
          )}

          {/* Indicador AHORA */}
          {nowInRange && (
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
              style={{ left: `${nowPct}%` }}
            >
              <div
                className="text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap font-mono-tnum tracking-wider"
                style={{ backgroundColor: 'var(--gold-500)', color: 'var(--navy-900)' }}
              >
                AHORA · {nowLabel}
              </div>
              <div
                className="w-0.5 h-3 mt-0.5 animate-pulse-glow"
                style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 0 6px var(--color-accent)' }}
              />
            </div>
          )}

          {/* Nodos */}
          {items.map(({ bloque: b, status }) => {
            const ini = hhmmToMin(b.hora_inicio.slice(0, 5))
            const leftPct = ((ini - start) / range) * 100
            const color = STATUS_COLOR[status as BlockStatus]
            const isMoney = b.es_money_block
            const isNow = status === 'now'
            const isDone = status === 'done'
            const isOverdue = status === 'overdue'

            return (
              <button
                key={b.id}
                onClick={() => scrollToBlock(b.id)}
                className="absolute -translate-x-1/2 flex flex-col items-center group focus:outline-none"
                style={{ left: `${leftPct}%`, top: 0 }}
                title={`${b.nombre} · ${b.hora_inicio.slice(0, 5)}–${b.hora_fin.slice(0, 5)}`}
              >
                {/* Nodo */}
                <div
                  className={`
                    relative flex items-center justify-center rounded-full transition-all duration-200
                    ${isNow ? 'w-6 h-6' : 'w-4 h-4'}
                    ${isNow ? 'animate-pulse-glow' : ''}
                    group-hover:scale-125
                  `}
                  style={{
                    backgroundColor: isDone || isNow ? color : 'var(--bg-card)',
                    border: `2px solid ${color}`,
                    boxShadow: isNow
                      ? `0 0 0 5px ${color}33, 0 0 16px ${color}66`
                      : isDone
                      ? `0 0 0 3px ${color}22`
                      : 'none',
                    marginTop: isNow ? 14 : 17, // alinear con la línea base (top: 24 = h-6)
                  }}
                >
                  {isDone && <Check className="h-2.5 w-2.5" strokeWidth={3} style={{ color: '#fff' }} />}
                  {isNow && isMoney && <Flame className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />}
                  {isOverdue && <span className="text-[8px] font-bold" style={{ color }}>!</span>}
                  {/* Anillo flame en money block aunque no esté NOW */}
                  {isMoney && !isNow && (
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{ boxShadow: `0 0 0 1px var(--color-flame), 0 0 6px var(--color-flame-bg)` }}
                    />
                  )}
                </div>

                {/* Hora */}
                <div
                  className="mt-2 text-[11px] font-mono font-semibold whitespace-nowrap"
                  style={{ color: isNow ? color : 'var(--text-primary)' }}
                >
                  {b.hora_inicio.slice(0, 5)}
                </div>
                {/* Nombre del bloque */}
                <div
                  className={`text-[10px] whitespace-nowrap hidden md:block ${isNow ? 'font-bold' : ''}`}
                  style={{
                    color: isNow ? color : isDone ? 'var(--color-success)' : isOverdue ? 'var(--color-flame)' : 'var(--text-secondary)',
                    maxWidth: 110,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {b.nombre}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function FocusNowCard({
  items, logsByBloque, nowMin,
}: {
  items: { bloque: DmoBloque; status: BlockStatus }[]
  logsByBloque: Map<number, DmoLog>
  nowMin: number
}) {
  const current = items.find((it) => it.status === 'now')
  if (!current) return null

  const b = current.bloque
  const log = logsByBloque.get(b.id)
  const valor = log?.valor_metrica ?? 0
  const fin = hhmmToMin(b.hora_fin.slice(0, 5))
  const remainingMin = Math.max(0, fin - nowMin)
  const hh = Math.floor(remainingMin / 60)
  const mm = remainingMin % 60
  const remainLabel = hh > 0 ? `${hh}h ${String(mm).padStart(2, '0')}m` : `${mm}m`

  const hasMetric = b.metrica_tipo === 'cantidad' && b.metrica_meta > 0
  const pct = hasMetric ? Math.min(100, Math.round((valor / b.metrica_meta) * 100)) : null

  const scrollToBlock = () => {
    const el = document.getElementById(`dmo-bloque-${b.id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl p-6 md:p-7"
      style={{
        background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 50%, var(--navy-700) 100%)',
        color: '#fff',
        border: '1px solid var(--navy-700)',
      }}
    >
      <div
        className="pointer-events-none absolute -top-1/2 -right-[10%] w-3/5 h-[200%]"
        style={{ background: 'radial-gradient(ellipse, rgba(201,161,88,0.18), transparent 60%)' }}
      />
      <div className="relative flex flex-col gap-2">
        <span className="eyebrow-line" style={{ color: 'var(--gold-400)' }}>
          Tu enfoque ahora
        </span>
        <h2
          className="font-serif-display leading-tight m-0"
          style={{ fontSize: 'clamp(24px, 3.6vw, 32px)', color: '#fff' }}
        >
          {b.nombre}
        </h2>
        <div className="font-mono-tnum text-sm" style={{ color: 'var(--gold-300)' }}>
          {b.hora_inicio.slice(0, 5)} – {b.hora_fin.slice(0, 5)} · faltan {remainLabel}
        </div>
        {b.descripcion && (
          <p className="text-sm leading-relaxed max-w-xl m-0 mt-1" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {b.descripcion}
          </p>
        )}

        {hasMetric && (
          <div className="mt-3 flex items-center gap-3">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, var(--gold-500), var(--gold-400))',
                  boxShadow: '0 0 12px rgba(220, 186, 126, 0.4)',
                }}
              />
            </div>
            <div className="font-mono-tnum text-sm font-semibold" style={{ color: '#fff' }}>
              {valor}<span style={{ color: 'var(--gold-400)' }}> / {b.metrica_meta}</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={scrollToBlock}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold active:scale-95 transition-all duration-200"
            style={{
              backgroundColor: 'var(--gold-500)',
              color: 'var(--navy-900)',
              border: '1px solid var(--gold-600)',
            }}
          >
            <Check className="h-4 w-4" />
            Ir al bloque
          </button>
        </div>
      </div>
    </div>
  )
}
