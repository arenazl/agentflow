import { useEffect, useMemo, useState } from 'react'
import { Mic } from 'lucide-react'
import { toast } from 'sonner'
import {
  ABMPageClassic, ABMTableClassic, ABMBadgeClassic,
  type ABMColumnClassic, type ViewMode,
  TOOLBAR_EXPORT,
} from '../components/ui/classic'
import { SideModal } from '../components/SideModal'
import { VoiceInputButton } from '../components/VoiceInputButton'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonTable } from '../components/ui/Skeleton'
import { CalendarView } from '../components/ui/CalendarView'
import { visitasAPI } from '../services/api'
import type { Visita } from '../types'

const ESTADO_BADGE: Record<string, 'info'|'success'|'danger'|'warning'|'neutral'> = {
  agendada:   'info',
  concretada: 'success',
  cancelada:  'danger',
  ausente:    'warning',
}

const RESULTADO_BADGE: Record<string, 'success'|'danger'|'gold'|'warning'|'neutral'> = {
  interesado:     'success',
  no_interesado:  'danger',
  hizo_oferta:    'gold',
  indeciso:       'warning',
  sin_resultado:  'neutral',
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/* ---- Mock ---- */
function mockVisita(i: number, over: Partial<Visita>): Visita {
  return {
    id: -i,
    cliente_id: -i, cliente_nombre: '',
    propiedad_id: -i, propiedad_titulo: '',
    vendedor_id: 1, vendedor_nombre: 'Patricio B.',
    fecha_hora: new Date().toISOString(),
    estado: 'agendada',
    resultado: 'sin_resultado',
    notas_voz: null,
    created_at: new Date().toISOString(),
    ...over,
  } as Visita
}
const MOCK: Visita[] = [
  mockVisita(1, { cliente_nombre: 'Familia Vázquez',    propiedad_titulo: 'Av. Libertador 4820 · 3°B',  fecha_hora: new Date(Date.now() +  3 * 3600000).toISOString(),   estado: 'agendada',   resultado: 'sin_resultado' }),
  mockVisita(2, { cliente_nombre: 'Pereyra / Ríos',     propiedad_titulo: 'Vidal 1944 · PH',            fecha_hora: new Date(Date.now() +  5 * 3600000).toISOString(),   estado: 'agendada',   resultado: 'sin_resultado' }),
  mockVisita(3, { cliente_nombre: 'María Solís',        propiedad_titulo: 'Caballito · 3 amb',           fecha_hora: new Date(Date.now() - 26 * 3600000).toISOString(),   estado: 'concretada', resultado: 'interesado' }),
  mockVisita(4, { cliente_nombre: 'Daniela Cattáneo',   propiedad_titulo: 'Arenales 2230 · 5°C',         fecha_hora: new Date(Date.now() + 48 * 3600000).toISOString(),   estado: 'agendada',   resultado: 'sin_resultado' }),
  mockVisita(5, { cliente_nombre: 'Juan Pellegrini',    propiedad_titulo: 'Belgrano · 2 amb',            fecha_hora: new Date(Date.now() - 50 * 3600000).toISOString(),   estado: 'concretada', resultado: 'hizo_oferta' }),
  mockVisita(6, { cliente_nombre: 'Lucía y M. Argerich', propiedad_titulo: 'Caballito · 3 amb',          fecha_hora: new Date(Date.now() - 70 * 3600000).toISOString(),   estado: 'cancelada',  resultado: 'no_interesado' }),
  mockVisita(7, { cliente_nombre: 'Carolina Beltrán',   propiedad_titulo: 'Belgrano R · 4 amb',          fecha_hora: new Date(Date.now() + 72 * 3600000).toISOString(),   estado: 'agendada',   resultado: 'sin_resultado', vendedor_nombre: 'Martín Cravero' }),
  mockVisita(8, { cliente_nombre: 'Estudio Vrancken',   propiedad_titulo: 'Núñez · local comercial',     fecha_hora: new Date(Date.now() - 8  * 3600000).toISOString(),   estado: 'concretada', resultado: 'indeciso',     vendedor_nombre: 'Florencia Reig' }),
]

export function Visitas() {
  const [serverData, setServerData] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeChip, setActiveChip] = useState('todas')
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('visitas:view') as ViewMode) || 'table')
  const [editing, setEditing] = useState<Visita | null>(null)

  useEffect(() => { localStorage.setItem('visitas:view', view) }, [view])

  const load = async () => {
    setLoading(true)
    try {
      const r = await visitasAPI.list()
      setServerData(r.data)
    } catch { toast.error('Error al cargar visitas') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const usingMock = !loading && serverData.length === 0
  const data = usingMock ? MOCK : serverData

  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return data
    return data.filter((v) =>
      (v.cliente_nombre   ?? '').toLowerCase().includes(q) ||
      (v.propiedad_titulo ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const counts = useMemo(() => {
    const now = Date.now()
    return {
      todas:        baseFiltered.length,
      proximas:     baseFiltered.filter((v) => v.estado === 'agendada' && new Date(v.fecha_hora).getTime() > now).length,
      concretadas:  baseFiltered.filter((v) => v.estado === 'concretada').length,
      canceladas:   baseFiltered.filter((v) => v.estado === 'cancelada').length,
    }
  }, [baseFiltered])

  const filtered = useMemo(() => {
    const now = Date.now()
    switch (activeChip) {
      case 'proximas':    return baseFiltered.filter((v) => v.estado === 'agendada' && new Date(v.fecha_hora).getTime() > now)
      case 'concretadas': return baseFiltered.filter((v) => v.estado === 'concretada')
      case 'canceladas':  return baseFiltered.filter((v) => v.estado === 'cancelada')
      default:            return baseFiltered
    }
  }, [baseFiltered, activeChip])

  const columns: ABMColumnClassic<Visita>[] = [
    {
      key: 'fecha_hora',
      header: 'Fecha y hora',
      sortable: true,
      sortValue: (v) => v.fecha_hora,
      render: (v) => <span className="font-mono-tnum text-xs" style={{ color: 'var(--ink-3)' }}>{formatFecha(v.fecha_hora)}</span>,
    },
    { key: 'cliente',   header: 'Cliente',   render: (v) => <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{v.cliente_nombre ?? '—'}</span> },
    { key: 'propiedad', header: 'Propiedad', render: (v) => <span className="truncate block max-w-xs">{v.propiedad_titulo ?? '—'}</span> },
    { key: 'estado',    header: 'Estado',    render: (v) => <ABMBadgeClassic label={v.estado} tone={ESTADO_BADGE[v.estado] ?? 'neutral'} /> },
    { key: 'resultado', header: 'Resultado', render: (v) => <ABMBadgeClassic label={v.resultado.replace('_', ' ')} tone={RESULTADO_BADGE[v.resultado] ?? 'neutral'} /> },
    { key: 'vendedor',  header: 'Vendedor',  render: (v) => v.vendedor_nombre ?? '—' },
  ]

  const submit = async () => {
    if (!editing) return
    try {
      await visitasAPI.update(editing.id, editing)
      toast.success('Visita actualizada')
      setEditing(null)
      load()
    } catch { toast.error('Error al guardar') }
  }

  const contextData = useMemo(() => {
    const now = Date.now()
    const horas = (iso: string) => (new Date(iso).getTime() - now) / (1000 * 60 * 60)
    const proximas3h = data
      .filter((v) => v.estado === 'agendada' && horas(v.fecha_hora) > 0 && horas(v.fecha_hora) < 3)
      .slice(0, 3)
      .map((v) => ({ id: v.id, fecha_hora: v.fecha_hora, cliente: v.cliente_nombre, propiedad: v.propiedad_titulo }))
    const sin_notas_24h = data
      .filter((v) => v.estado === 'concretada' && !v.notas_voz && horas(v.fecha_hora) < -1 && horas(v.fecha_hora) > -48)
      .slice(0, 3)
      .map((v) => ({ id: v.id, cliente: v.cliente_nombre, fecha_hora: v.fecha_hora }))
    return {
      ahora: new Date().toISOString(),
      total_visibles: filtered.length,
      visitas_proximas_3h: proximas3h,
      visitas_sin_notas_24h: sin_notas_24h,
      visitas_interesado_sin_deal: data.filter((v) => v.resultado === 'interesado').length,
    }
  }, [data, filtered])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6">
      <ABMPageClassic
        eyebrow="Cartera · Agenda"
        title="Visitas"
        subtitleParts={[
          { strong: counts.todas,       label: 'visitas en agenda' },
          { strong: counts.proximas,    label: 'próximas' },
          { strong: counts.concretadas, label: 'concretadas' },
        ]}
        filterChips={[
          { key: 'todas',       label: 'Todas',       count: counts.todas       },
          { key: 'proximas',    label: 'Próximas',    count: counts.proximas    },
          { key: 'concretadas', label: 'Concretadas', count: counts.concretadas },
          { key: 'canceladas',  label: 'Canceladas',  count: counts.canceladas  },
        ]}
        activeChip={activeChip}
        onChipChange={setActiveChip}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por cliente o propiedad..."
        toolbar={[
          { ...TOOLBAR_EXPORT, variant: 'outline', onClick: () => toast.info('Exportar — próximamente') },
        ]}
        onAdd={() => toast.info('Alta de visita — próximamente')}
        addLabel="Agendar visita"
        view={view}
        onViewChange={(v) => { setView(v); try { localStorage.setItem('visitas:view', v) } catch {} }}
        availableViews={['table', 'cards', 'calendar']}
        loading={loading}
        isEmpty={!loading && filtered.length === 0 && view !== 'calendar'}
        emptyMessage="No hay visitas con esos filtros."
      >
        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : view === 'calendar' ? (
          <CalendarView
            items={filtered}
            getId={(v) => v.id}
            getDate={(v) => v.fecha_hora}
            getTime={(v) => new Date(v.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            getLabel={(v) => `${v.cliente_nombre ?? '—'} · ${v.propiedad_titulo ?? ''}`}
            getColor={(v) => {
              const map: Record<string, string> = {
                agendada:   'var(--color-blue, #3b82f6)',
                concretada: 'var(--color-success)',
                cancelada:  'var(--color-danger)',
                ausente:    'var(--color-warning)',
              }
              return map[v.estado] || 'var(--color-accent)'
            }}
            onItemClick={(v) => setEditing({ ...v })}
            helperText={`${filtered.length} visitas`}
          />
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v, i) => {
              const estadoMap: Record<string, { color: string; label: string }> = {
                agendada:   { color: 'var(--color-blue, #3b82f6)', label: 'Agendada' },
                concretada: { color: 'var(--color-success)',       label: 'Concretada' },
                cancelada:  { color: 'var(--color-danger)',        label: 'Cancelada' },
                ausente:    { color: 'var(--color-warning)',       label: 'Ausente' },
              }
              const est = estadoMap[v.estado] || { color: 'var(--ink-5)', label: v.estado }
              return (
                <button
                  key={v.id}
                  onClick={() => setEditing({ ...v })}
                  className="text-left rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up relative overflow-hidden"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border-color)',
                    boxShadow: '0 1px 3px rgba(14,43,79,0.05)',
                    animationDelay: `${Math.min(i, 8) * 60}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: est.color }} />
                  <div className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: est.color }}>
                    {est.label}
                  </div>
                  <div className="font-serif-display text-xl leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                    {v.cliente_nombre ?? '—'}
                  </div>
                  <div className="text-xs mb-3 truncate" style={{ color: 'var(--ink-4)' }}>
                    {v.propiedad_titulo}
                  </div>
                  <div className="text-sm font-mono-tnum" style={{ color: 'var(--ink-3)' }}>
                    {formatFecha(v.fecha_hora)}
                  </div>
                  <div className="text-xs mt-2" style={{ color: 'var(--ink-5)' }}>
                    {v.vendedor_nombre}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <ABMTableClassic
            data={filtered}
            columns={columns}
            keyExtractor={(v) => v.id}
            onRowClick={(v) => setEditing({ ...v })}
          />
        )}
      </ABMPageClassic>

      <SideModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Visita"
        subtitle={editing?.propiedad_titulo ?? ''}
        stickyFooter={
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-[var(--border-color)]">Cancelar</button>
            <button onClick={submit} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white active:scale-95 transition-all duration-200">Guardar</button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div className="text-sm">
              <div className="text-[var(--text-secondary)]">Cliente</div>
              <div className="font-semibold">{editing.cliente_nombre}</div>
            </div>
            <div className="text-sm">
              <div className="text-[var(--text-secondary)]">Fecha y hora</div>
              <div className="font-semibold">{formatFecha(editing.fecha_hora)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select value={editing.estado} onChange={(e) => setEditing({ ...editing, estado: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                {['agendada', 'concretada', 'cancelada', 'ausente'].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Resultado</label>
              <select value={editing.resultado} onChange={(e) => setEditing({ ...editing, resultado: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                {['sin_resultado', 'interesado', 'no_interesado', 'hizo_oferta', 'indeciso'].map((o) => <option key={o}>{o.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Notas post-visita (dictado)</label>
                <VoiceInputButton
                  onTranscript={(t) => setEditing({ ...editing, notas_voz: (editing.notas_voz ?? '') + (editing.notas_voz ? ' ' : '') + t })}
                  onError={(m) => toast.error(m)}
                />
              </div>
              <textarea
                rows={5}
                value={editing.notas_voz ?? ''}
                onChange={(e) => setEditing({ ...editing, notas_voz: e.target.value })}
                placeholder="Hablá tras la visita y queda registrado..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">Tip: presioná el icono del microfono y dictá las notas en castellano.</p>
            </div>
          </div>
        )}
      </SideModal>
      </div>
      <AICoachPanel screen="visitas" contextData={contextData} />
    </div>
  )
}
