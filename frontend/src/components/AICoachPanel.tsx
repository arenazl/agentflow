import { useEffect, useState, useRef } from 'react'
import { Sparkles, RefreshCw, X, ChevronRight } from 'lucide-react'
import api from '../services/api'

interface CoachAction {
  type: 'navigate' | 'whatsapp' | 'llamada' | 'mail' | 'action'
  to?: string
  phone?: string
  text?: string
  endpoint?: string
  body?: unknown
}

interface CoachWidget {
  title: string
  body: string
  accent: 'gold' | 'flame' | 'ok' | 'blue'
  cta_label?: string | null
  cta_action?: CoachAction | null
}

interface CoachResponse {
  hot_tip?: CoachWidget | null
  next_action?: CoachWidget | null
  streak?: CoachWidget | null
}

interface AICoachPanelProps {
  screen: string
  contextData: Record<string, unknown>
  refreshIntervalMs?: number
}

const ACCENT_COLOR: Record<CoachWidget['accent'], string> = {
  gold:  'var(--color-accent)',
  flame: 'var(--color-flame)',
  ok:    'var(--color-success)',
  blue:  'var(--color-blue)',
}

function executeAction(action: CoachAction) {
  switch (action.type) {
    case 'navigate':
      if (action.to) window.location.href = action.to
      return
    case 'whatsapp':
      if (action.phone) {
        const phone = action.phone.replace(/[^0-9]/g, '')
        const text = action.text ? `?text=${encodeURIComponent(action.text)}` : ''
        window.open(`https://wa.me/${phone}${text}`, '_blank')
      }
      return
    case 'llamada':
      if (action.phone) window.location.href = `tel:${action.phone}`
      return
    case 'mail':
      if (action.to) window.location.href = `mailto:${action.to}`
      return
    case 'action':
      console.info('AICoach action endpoint:', action.endpoint, action.body)
      return
  }
}

export function AICoachPanel({ screen, contextData, refreshIntervalMs = 30 * 60 * 1000 }: AICoachPanelProps) {
  const [data, setData] = useState<CoachResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem(`ai-coach-collapsed:${screen}`) === '1',
  )
  const ctxKey = JSON.stringify(contextData)
  const lastCtx = useRef<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.post<CoachResponse>('/ai-coach/', { screen, context: contextData })
      setData(r.data)
    } catch {
      setData({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (lastCtx.current === ctxKey) return
    lastCtx.current = ctxKey
    load()
    const t = setInterval(load, refreshIntervalMs)
    return () => clearInterval(t)
  }, [ctxKey, refreshIntervalMs])

  useEffect(() => {
    localStorage.setItem(`ai-coach-collapsed:${screen}`, collapsed ? '1' : '0')
  }, [collapsed, screen])

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        title="Mostrar AI Coach"
        className="fixed right-4 bottom-4 z-30 p-3 rounded-full shadow-lg active:scale-95 transition-all duration-200 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
          color: 'var(--color-primary)',
        }}
      >
        <Sparkles className="h-5 w-5" />
      </button>
    )
  }

  const allEmpty = !loading && !data?.hot_tip && !data?.next_action && !data?.streak

  return (
    <aside
      className="hidden xl:flex flex-shrink-0 w-80 flex-col border-l"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))' }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <span className="font-semibold text-sm">AI Coach</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={load}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-all duration-200"
            title="Refrescar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-all duration-200"
            title="Ocultar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        <WidgetCard label="HOT TIP" widget={data?.hot_tip} loading={loading} />
        <WidgetCard label="PRÓXIMO" widget={data?.next_action} loading={loading} />
        <WidgetCard label="RESUMEN" widget={data?.streak} loading={loading} />

        {allEmpty && (
          <div className="text-xs text-center py-6" style={{ color: 'var(--text-secondary)' }}>
            Sin recomendaciones nuevas.
            <br />
            <button onClick={load} className="underline mt-2" style={{ color: 'var(--color-accent)' }}>
              Refrescar
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function WidgetCard({ label, widget, loading }: { label: string; widget?: CoachWidget | null; loading: boolean }) {
  if (loading && !widget) {
    return (
      <div className="rounded-lg border p-3 space-y-2 animate-pulse" style={{ borderColor: 'var(--border-color)' }}>
        <div className="h-3 w-20 rounded" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-3 w-full rounded" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-3 w-5/6 rounded" style={{ backgroundColor: 'var(--bg-hover)' }} />
      </div>
    )
  }
  if (!widget) return null
  const color = ACCENT_COLOR[widget.accent] ?? 'var(--color-accent)'

  return (
    <div
      className="rounded-lg border overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--bg-app)',
        boxShadow: `0 0 0 1px ${color}22`,
      }}
    >
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-3 space-y-2">
        <div className="text-[10px] font-bold tracking-wider" style={{ color }}>
          {label}
        </div>
        <div className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
          {widget.title}
        </div>
        <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
          {widget.body}
        </div>
        {widget.cta_label && widget.cta_action && (
          <button
            className="mt-2 w-full flex items-center justify-center gap-1 text-xs py-2 rounded font-semibold active:scale-95 transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: color, color: '#ffffff' }}
            onClick={() => widget.cta_action && executeAction(widget.cta_action)}
          >
            {widget.cta_label}
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
