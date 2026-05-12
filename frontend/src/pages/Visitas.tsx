import { useEffect, useMemo, useState } from 'react'
import { Calendar, Mic } from 'lucide-react'
import { toast } from 'sonner'
import { ABMPage } from '../components/ui/ABMPage'
import { ABMTable, ABMColumn } from '../components/ui/ABMTable'
import { SideModal } from '../components/SideModal'
import { VoiceInputButton } from '../components/VoiceInputButton'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonTable } from '../components/ui/Skeleton'
import { visitasAPI } from '../services/api'
import type { Visita } from '../types'

const ESTADO_COLOR: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-700',
  concretada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
  ausente: 'bg-orange-100 text-orange-700',
}

const RESULTADO_COLOR: Record<string, string> = {
  interesado: 'bg-green-50 text-green-700',
  no_interesado: 'bg-red-50 text-red-700',
  hizo_oferta: 'bg-purple-50 text-purple-700',
  indeciso: 'bg-yellow-50 text-yellow-700',
  sin_resultado: 'bg-gray-50 text-gray-600',
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function Visitas() {
  const [data, setData] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Visita | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await visitasAPI.list()
      setData(r.data)
    } catch { toast.error('Error al cargar visitas') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = data.filter((v) => {
    const q = search.toLowerCase()
    return (v.cliente_nombre ?? '').toLowerCase().includes(q) ||
           (v.propiedad_titulo ?? '').toLowerCase().includes(q)
  })

  const columns: ABMColumn<Visita>[] = [
    { key: 'fecha_hora', header: 'Fecha y hora', sortable: true, sortValue: (v) => v.fecha_hora, render: (v) => formatFecha(v.fecha_hora) },
    { key: 'cliente', header: 'Cliente', render: (v) => v.cliente_nombre ?? '—' },
    { key: 'propiedad', header: 'Propiedad', render: (v) => <span className="truncate block max-w-xs">{v.propiedad_titulo ?? '—'}</span> },
    { key: 'estado', header: 'Estado', render: (v) => (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${ESTADO_COLOR[v.estado] ?? ''}`}>{v.estado}</span>
    ) },
    { key: 'resultado', header: 'Resultado', render: (v) => (
      <span className={`text-xs px-2 py-0.5 rounded ${RESULTADO_COLOR[v.resultado] ?? ''}`}>{v.resultado.replace('_', ' ')}</span>
    ) },
    { key: 'vendedor', header: 'Vendedor', render: (v) => v.vendedor_nombre ?? '—' },
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
      <ABMPage
        title="Visitas"
        icon={<Calendar className="h-6 w-6" />}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por cliente o propiedad..."
        loading={false}
        isEmpty={!loading && filtered.length === 0}
        buttonLabel="Agendar visita"
        onAdd={() => toast.info('Alta de visita: pendiente (demo)')}
      >
        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : (
          <ABMTable
            data={filtered}
            columns={columns}
            keyExtractor={(v) => v.id}
            onEdit={(v) => setEditing({ ...v })}
          />
        )}
      </ABMPage>

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
