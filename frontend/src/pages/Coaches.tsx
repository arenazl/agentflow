import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { GraduationCap, Plus, Pencil, Trash2, ExternalLink, ShieldCheck } from 'lucide-react'
import { coachesAPI } from '../services/api'
import { SideModal } from '../components/SideModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import type { Coach } from '../types'

const empty: Partial<Coach> = {
  nombre: '',
  descripcion: '',
  foto_url: '',
  fuente_url: '',
  es_oficial: false,
}

export function Coaches() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'gerente'
  const [items, setItems] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Coach> | null>(null)
  const [confirmDel, setConfirmDel] = useState<Coach | null>(null)

  const load = async () => {
    try {
      const r = await coachesAPI.list()
      setItems(r.data)
    } catch { toast.error('Error al cargar coaches') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing({ ...empty }); setModalOpen(true) }
  const openEdit = (c: Coach) => { setEditing({ ...c }); setModalOpen(true) }

  const save = async () => {
    if (!editing?.nombre?.trim()) {
      toast.error('Nombre requerido')
      return
    }
    try {
      const payload = {
        nombre: editing.nombre,
        descripcion: editing.descripcion || null,
        foto_url: editing.foto_url || null,
        fuente_url: editing.fuente_url || null,
        es_oficial: !!editing.es_oficial,
      }
      if (editing.id) await coachesAPI.update(editing.id, payload)
      else await coachesAPI.create(payload)
      toast.success('Coach guardado')
      setModalOpen(false)
      load()
    } catch { toast.error('Error al guardar') }
  }

  const remove = async () => {
    if (!confirmDel) return
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
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6" style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 className="text-2xl font-bold">Coaches</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Metodologias de productividad para vendedores
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 active:scale-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" /> Nuevo coach
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border p-5 animate-fade-in-up"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-4/5 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}
                  >
                    {c.nombre.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{c.nombre}</h3>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>{c.templates_count ?? 0} template{(c.templates_count ?? 0) !== 1 ? 's' : ''}</span>
                      {c.es_oficial && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold"
                              style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                          <ShieldCheck className="h-3 w-3" /> Oficial
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {c.descripcion && (
                <p className="text-sm mb-3 line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
                  {c.descripcion}
                </p>
              )}
              <div className="flex items-center justify-between gap-2 mt-3">
                {c.fuente_url ? (
                  <a
                    href={c.fuente_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <ExternalLink className="h-3 w-3" /> Fuente
                  </a>
                ) : <span />}
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded hover:bg-black/5 transition-all duration-200 active:scale-95"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    {!c.es_oficial && (
                      <button
                        onClick={() => setConfirmDel(c)}
                        className="p-1.5 rounded hover:bg-black/5 transition-all duration-200 active:scale-95"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" style={{ color: 'var(--color-danger)' }} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SideModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? 'Editar coach' : 'Nuevo coach'}
        subtitle="Metodologia de productividad para vendedores"
        stickyFooter={
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border-color)' }}>Cancelar</button>
            <button onClick={save} className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}>Guardar</button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Nombre">
              <input
                value={editing.nombre ?? ''}
                onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder="Tom Ferry, Buffini, ..."
              />
            </Field>
            <Field label="Descripcion">
              <textarea
                value={editing.descripcion ?? ''}
                onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </Field>
            <Field label="Foto URL">
              <input
                value={editing.foto_url ?? ''}
                onChange={(e) => setEditing({ ...editing, foto_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder="https://..."
              />
            </Field>
            <Field label="Fuente URL">
              <input
                value={editing.fuente_url ?? ''}
                onChange={(e) => setEditing({ ...editing, fuente_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder="https://tomferry.com/"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.es_oficial}
                onChange={(e) => setEditing({ ...editing, es_oficial: e.target.checked })}
              />
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
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1"
             style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}
