import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, ExternalLink, ShieldCheck } from 'lucide-react'
import {
  ABMPageClassic, ABMCardClassic, ABMBadgeClassic,
  type ViewMode,
} from '../components/ui/classic'
import { coachesAPI } from '../services/api'
import { SideModal } from '../components/SideModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { SkeletonGrid } from '../components/ui/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import type { Coach } from '../types'

const empty: Partial<Coach> = {
  nombre: '',
  descripcion: '',
  foto_url: '',
  fuente_url: '',
  es_oficial: false,
}

/* ---- Mock ---- */
const MOCK: Coach[] = [
  // @ts-expect-error mock
  { id: -1, nombre: 'Tom Ferry',      descripcion: 'Metodología de coaching #1 en real estate USA. Foco en DMO, scripts y mindset diario.', es_oficial: true,  templates_count: 6, fuente_url: 'https://tomferry.com' },
  // @ts-expect-error mock
  { id: -2, nombre: 'Buffini & Co.',  descripcion: 'Sistema "Working by Referral" — captación basada en relaciones y pop-bys mensuales.',  es_oficial: true,  templates_count: 4, fuente_url: 'https://buffiniandcompany.com' },
  // @ts-expect-error mock
  { id: -3, nombre: 'Brian Buffini',  descripcion: 'Programa "100 Days to Greatness" — onboarding intensivo para vendedores nuevos.',      es_oficial: true,  templates_count: 3 },
  // @ts-expect-error mock
  { id: -4, nombre: 'Mike Ferry',     descripcion: 'Old-school prospecting: llamados en frío diarios + pre-cierres por teléfono.',          es_oficial: true,  templates_count: 2 },
  // @ts-expect-error mock
  { id: -5, nombre: 'Beyker Method',  descripcion: 'Adaptación local para mercado AR — DMO híbrido WhatsApp + ZonaProp + visitas en zona.', es_oficial: false, templates_count: 5 },
  // @ts-expect-error mock
  { id: -6, nombre: 'Coldwell Banker Beyker LATAM', descripcion: 'Manual oficial CB AR: pop-bys digitales, money block matinal, AI Coach integrado.', es_oficial: true, templates_count: 8 },
]

export function Coaches() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'gerente'
  const [serverData, setServerData] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeChip, setActiveChip] = useState('todos')
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('coaches:view') as ViewMode) || 'cards')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Coach> | null>(null)
  const [confirmDel, setConfirmDel] = useState<Coach | null>(null)

  useEffect(() => { localStorage.setItem('coaches:view', view) }, [view])

  const load = async () => {
    try {
      const r = await coachesAPI.list()
      setServerData(r.data)
    } catch { toast.error('Error al cargar coaches') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const usingMock = !loading && serverData.length === 0
  const data = usingMock ? MOCK : serverData

  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return data
    return data.filter((c) =>
      c.nombre.toLowerCase().includes(q) ||
      (c.descripcion ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const counts = useMemo(() => ({
    todos:     baseFiltered.length,
    oficiales: baseFiltered.filter((c) => c.es_oficial).length,
    custom:    baseFiltered.filter((c) => !c.es_oficial).length,
  }), [baseFiltered])

  const filtered = useMemo(() => {
    switch (activeChip) {
      case 'oficiales': return baseFiltered.filter((c) => c.es_oficial)
      case 'custom':    return baseFiltered.filter((c) => !c.es_oficial)
      default:          return baseFiltered
    }
  }, [baseFiltered, activeChip])

  const openNew = () => { setEditing({ ...empty }); setModalOpen(true) }
  const openEdit = (c: Coach) => { setEditing({ ...c }); setModalOpen(true) }

  const save = async () => {
    if (!editing?.nombre?.trim()) { toast.error('Nombre requerido'); return }
    try {
      const payload = {
        nombre: editing.nombre,
        descripcion: editing.descripcion || null,
        foto_url: editing.foto_url || null,
        fuente_url: editing.fuente_url || null,
        es_oficial: !!editing.es_oficial,
      }
      if (editing.id && editing.id > 0) await coachesAPI.update(editing.id, payload)
      else await coachesAPI.create(payload)
      toast.success('Coach guardado')
      setModalOpen(false)
      load()
    } catch { toast.error('Error al guardar') }
  }

  const remove = async () => {
    if (!confirmDel) return
    if (confirmDel.id < 0) {
      toast.info('No se puede eliminar un coach demo')
      setConfirmDel(null)
      return
    }
    try {
      await coachesAPI.remove(confirmDel.id)
      toast.success('Coach eliminado')
      setConfirmDel(null)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error al eliminar')
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6">
        <ABMPageClassic
          eyebrow="Equipo · Metodologías"
          title="Coaches"
          subtitleParts={[
            { strong: counts.todos,     label: 'metodologías en uso' },
            { strong: counts.oficiales, label: 'oficiales' },
          ]}
          filterChips={[
            { key: 'todos',     label: 'Todos',     count: counts.todos     },
            { key: 'oficiales', label: 'Oficiales', count: counts.oficiales },
            { key: 'custom',    label: 'Custom',    count: counts.custom    },
          ]}
          activeChip={activeChip}
          onChipChange={setActiveChip}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar coach, metodología..."
          onAdd={canEdit ? openNew : undefined}
          addLabel="Nuevo coach"
          view={view}
          onViewChange={setView}
          loading={loading}
          isEmpty={!loading && filtered.length === 0}
          emptyMessage="No hay coaches que coincidan con esos filtros."
        >
          {loading ? (
            <SkeletonGrid count={6} />
          ) : view === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((c, i) => (
                <ABMCardClassic
                  key={c.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: 'both' }}
                  avatar={{ initials: c.nombre, tone: c.es_oficial ? 'gold' : 'navy' }}
                  title={c.nombre}
                  subtitle={c.descripcion ?? ''}
                  stats={[
                    { value: c.templates_count ?? 0, label: 'Templates' },
                    { value: c.es_oficial ? 'Sí' : 'No', label: 'Oficial' },
                  ]}
                  footerText={
                    <span className="flex items-center gap-2 flex-wrap">
                      {c.es_oficial && <ABMBadgeClassic label="Oficial" icon={ShieldCheck} tone="success" />}
                      {c.fuente_url && (
                        <a
                          href={c.fuente_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs hover:underline"
                          style={{ color: 'var(--navy-700)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" /> Fuente
                        </a>
                      )}
                    </span>
                  }
                  kebabItems={canEdit ? [
                    { icon: Pencil, label: 'Editar', onClick: () => openEdit(c) },
                    ...(c.es_oficial ? [] : [{ icon: Trash2, label: 'Eliminar', onClick: () => setConfirmDel(c), tone: 'danger' as const, divider: true }]),
                  ] : []}
                  onClick={canEdit ? () => openEdit(c) : undefined}
                />
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl overflow-x-auto"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)' }}
            >
              <table className="w-full text-sm border-collapse" style={{ minWidth: 680 }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-3)' }}>
                    <th className="uppercase-label py-3 px-4 text-left">Coach</th>
                    <th className="uppercase-label py-3 px-4 text-left">Descripción</th>
                    <th className="uppercase-label py-3 px-4 text-right">Templates</th>
                    <th className="uppercase-label py-3 px-4 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                      <td className="py-3 px-4 font-semibold">{c.nombre}</td>
                      <td className="py-3 px-4 text-xs" style={{ color: 'var(--ink-3)' }}>{c.descripcion}</td>
                      <td className="py-3 px-4 font-mono-tnum text-right">{c.templates_count ?? 0}</td>
                      <td className="py-3 px-4">
                        {c.es_oficial
                          ? <ABMBadgeClassic label="Oficial" icon={ShieldCheck} tone="success" />
                          : <ABMBadgeClassic label="Custom" tone="neutral" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ABMPageClassic>

        <SideModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing?.id && editing.id > 0 ? 'Editar coach' : 'Nuevo coach'}
          subtitle="Metodología de productividad para vendedores"
          stickyFooter={
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border-color)' }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: 'var(--navy-800)' }}>Guardar</button>
            </div>
          }
        >
          {editing && (
            <div className="space-y-4">
              <Field label="Nombre">
                <input value={editing.nombre ?? ''} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent"
                  style={{ borderColor: 'var(--border-color)' }}
                  placeholder="Tom Ferry, Buffini, ..." />
              </Field>
              <Field label="Descripción">
                <textarea value={editing.descripcion ?? ''} onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent"
                  style={{ borderColor: 'var(--border-color)' }} />
              </Field>
              <Field label="Foto URL">
                <input value={editing.foto_url ?? ''} onChange={(e) => setEditing({ ...editing, foto_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent"
                  style={{ borderColor: 'var(--border-color)' }} placeholder="https://..." />
              </Field>
              <Field label="Fuente URL">
                <input value={editing.fuente_url ?? ''} onChange={(e) => setEditing({ ...editing, fuente_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent"
                  style={{ borderColor: 'var(--border-color)' }} placeholder="https://tomferry.com/" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.es_oficial}
                  onChange={(e) => setEditing({ ...editing, es_oficial: e.target.checked })} />
                Coach oficial (no puede eliminarse desde la UI)
              </label>
            </div>
          )}
        </SideModal>

        <ConfirmModal
          isOpen={!!confirmDel}
          onClose={() => setConfirmDel(null)}
          onConfirm={remove}
          title="Eliminar coach"
          message={`¿Eliminar a ${confirmDel?.nombre}? Sus templates quedarán huérfanos.`}
          confirmLabel="Eliminar"
          variant="danger"
        />
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="uppercase-label block mb-1">{label}</label>
      {children}
    </div>
  )
}
