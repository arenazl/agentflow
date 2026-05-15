import { useEffect, useMemo, useState } from 'react'
import { GitBranch, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { pipelineAPI } from '../services/api'
import { AICoachPanel } from '../components/AICoachPanel'
import { Skeleton } from '../components/ui/Skeleton'
import type { PipelineDeal } from '../types'

const ETAPAS: { key: string; label: string; color: string }[] = [
  { key: 'captado',       label: 'Captado',        color: 'var(--text-secondary)' },
  { key: 'publicado',     label: 'Publicado',      color: 'var(--color-blue)' },
  { key: 'visita',        label: 'Visita',         color: 'var(--color-accent)' },
  { key: 'reserva',       label: 'Reserva',        color: 'var(--color-warning)' },
  { key: 'boleto',        label: 'Boleto',         color: 'var(--color-flame)' },
  { key: 'escrituracion', label: 'Escrituración',  color: 'var(--color-success)' },
]

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

export function Pipeline() {
  const [deals, setDeals] = useState<PipelineDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<PipelineDeal | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await pipelineAPI.list()
      setDeals(r.data)
    } catch { toast.error('Error al cargar pipeline') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const moveTo = async (d: PipelineDeal, etapa: string) => {
    if (d.etapa === etapa) return
    try {
      await pipelineAPI.update(d.id, { etapa })
      toast.success(`${d.cliente_nombre}: ${etapa}`)
      load()
    } catch { toast.error('Error al mover') }
  }

  const byEtapa = (etapa: string) => deals.filter((d) => d.etapa === etapa)
  const totalComision = (etapa: string) => byEtapa(etapa).reduce((acc, d) => acc + (d.comision_estimada ?? 0), 0)

  const contextData = useMemo(() => ({
    deals_por_etapa: Object.fromEntries(ETAPAS.map((e) => [e.key, byEtapa(e.key).length])),
    pipeline_value_usd: deals.reduce((acc, d) => acc + (d.comision_estimada ?? 0), 0),
    deal_mas_maduro_estancado: deals
      .filter((d) => ['reserva', 'boleto'].includes(d.etapa))
      .map((d) => ({ ...d, dias: daysSince(d.updated_at) }))
      .sort((a, b) => b.dias - a.dias)[0],
    deals_recien_captados_sin_publicar: byEtapa('captado').length,
  }), [deals])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6">
        <div className="flex-shrink-0 flex flex-col gap-2 mb-4">
          <span className="eyebrow-line">Operación · Funnel</span>
          <h1
            className="font-serif-display leading-none m-0"
            style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', color: 'var(--text-primary)' }}
          >
            Pipeline
          </h1>
          <p className="text-sm m-0" style={{ color: 'var(--ink-4)' }}>
            Arrastrá cada deal a la siguiente etapa.
            <span className="ml-1">
              <strong style={{ color: 'var(--text-primary)' }}>{deals.length}</strong> deals abiertos.
            </span>
          </p>
        </div>

        {loading ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-x-auto pb-4">
            <div className="inline-flex gap-3 h-full min-w-full">
              {ETAPAS.map((et) => {
                const items = byEtapa(et.key)
                const total = totalComision(et.key)
                const isDragOver = dragOver === et.key
                return (
                  <div
                    key={et.key}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(et.key) }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => { setDragOver(null); if (dragging) moveTo(dragging, et.key) }}
                    className="flex flex-col w-72 flex-shrink-0 rounded-xl border transition-all duration-200"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: isDragOver ? et.color : 'var(--border-color)',
                      boxShadow: isDragOver ? `0 0 0 1px ${et.color}, 0 0 24px ${et.color}33` : 'none',
                    }}
                  >
                    <div
                      className="flex-shrink-0 p-3 border-b"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: et.color }} />
                          <span className="font-semibold text-sm">{et.label}</span>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: `${et.color}22`, color: et.color }}
                        >
                          {items.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <DollarSign className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
                        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          USD {total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                      {items.length === 0 && (
                        <div className="text-xs text-center py-8 italic" style={{ color: 'var(--text-secondary)' }}>
                          Sin deals
                        </div>
                      )}
                      {items.map((d) => {
                        const dias = daysSince(d.updated_at)
                        const stale = dias > 21
                        return (
                          <div
                            key={d.id}
                            draggable
                            onDragStart={() => setDragging(d)}
                            onDragEnd={() => setDragging(null)}
                            className="rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up"
                            style={{
                              backgroundColor: 'var(--bg-app)',
                              borderColor: stale ? 'var(--color-flame)' : 'var(--border-color)',
                              borderLeftWidth: '3px',
                              borderLeftColor: et.color,
                            }}
                          >
                            <div className="font-semibold text-sm truncate">{d.propiedad_titulo}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {d.cliente_nombre}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-xs">
                                <div className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                                  {d.moneda} {d.precio_negociado?.toLocaleString() ?? '—'}
                                </div>
                                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                  Com: USD {d.comision_estimada?.toLocaleString() ?? '—'}
                                </div>
                              </div>
                              <span
                                className="text-xs px-2 py-0.5 rounded font-bold"
                                style={{ backgroundColor: `${et.color}22`, color: et.color }}
                              >
                                {d.probabilidad_pct}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                              <span className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                                {d.vendedor_nombre}
                              </span>
                              <span
                                className="text-[10px] font-semibold"
                                style={{ color: stale ? 'var(--color-flame)' : 'var(--text-secondary)' }}
                              >
                                {dias}d
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <AICoachPanel screen="pipeline" contextData={contextData} />
    </div>
  )
}
