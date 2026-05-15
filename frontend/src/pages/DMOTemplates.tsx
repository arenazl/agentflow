import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Layers, Plus, Pencil, Trash2, Copy, Flame, Star,
  GripVertical, ArrowUp, ArrowDown,
} from 'lucide-react'
import { coachesAPI, dmoTemplatesAPI } from '../services/api'
import { SideModal } from '../components/SideModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import type { Coach, DmoTemplate, DmoBloque, MetricaTipo } from '../types'

type BloqueDraft = Omit<DmoBloque, 'id' | 'template_id'> & { id?: number }

const emptyBloque: BloqueDraft = {
  nombre: '',
  descripcion: '',
  hora_inicio: '09:00',
  hora_fin: '10:00',
  color: '#3b82f6',
  orden: 0,
  es_money_block: false,
  metrica_tipo: 'checkbox',
  metrica_label: '',
  metrica_meta: 0,
}

interface TemplateDraft {
  id?: number
  coach_id: number | null
  nombre: string
  descripcion: string
  mercado: string
  activo: boolean
  es_default_inmobiliaria: boolean
  bloques: BloqueDraft[]
}

const emptyTemplate: TemplateDraft = {
  coach_id: null,
  nombre: '',
  descripcion: '',
  mercado: 'AR',
  activo: true,
  es_default_inmobiliaria: false,
  bloques: [],
}

export function DMOTemplates() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'gerente'
  const [templates, setTemplates] = useState<DmoTemplate[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TemplateDraft | null>(null)
  const [confirmDel, setConfirmDel] = useState<DmoTemplate | null>(null)

  const load = async () => {
    try {
      const [tr, cr] = await Promise.all([dmoTemplatesAPI.list(), coachesAPI.list()])
      setTemplates(tr.data)
      setCoaches(cr.data)
    } catch { toast.error('Error al cargar templates') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing({ ...emptyTemplate, coach_id: coaches[0]?.id ?? null, bloques: [] })
    setModalOpen(true)
  }

  const openEdit = (t: DmoTemplate) => {
    setEditing({
      id: t.id,
      coach_id: t.coach_id,
      nombre: t.nombre,
      descripcion: t.descripcion ?? '',
      mercado: t.mercado ?? '',
      activo: t.activo,
      es_default_inmobiliaria: t.es_default_inmobiliaria,
      bloques: t.bloques.map(({ id, template_id, ...rest }) => ({ id, ...rest })),
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!editing) return
    if (!editing.nombre.trim()) return toast.error('Nombre requerido')
    if (!editing.coach_id) return toast.error('Coach requerido')
    if (editing.bloques.length === 0) return toast.error('Agregá al menos un bloque')

    const payload = {
      coach_id: editing.coach_id,
      nombre: editing.nombre,
      descripcion: editing.descripcion || null,
      mercado: editing.mercado || null,
      activo: editing.activo,
      es_default_inmobiliaria: editing.es_default_inmobiliaria,
      bloques: editing.bloques.map((b, i) => ({
        nombre: b.nombre,
        descripcion: b.descripcion || null,
        hora_inicio: b.hora_inicio,
        hora_fin: b.hora_fin,
        color: b.color,
        orden: i + 1,
        es_money_block: b.es_money_block,
        metrica_tipo: b.metrica_tipo,
        metrica_label: b.metrica_label || null,
        metrica_meta: b.metrica_meta,
      })),
    }
    try {
      if (editing.id) await dmoTemplatesAPI.update(editing.id, payload)
      else await dmoTemplatesAPI.create(payload)
      toast.success('Template guardado')
      setModalOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error al guardar')
    }
  }

  const clone = async (t: DmoTemplate) => {
    try {
      await dmoTemplatesAPI.clone(t.id)
      toast.success('Template clonado')
      load()
    } catch { toast.error('Error al clonar') }
  }

  const remove = async () => {
    if (!confirmDel) return
    try {
      await dmoTemplatesAPI.remove(confirmDel.id)
      toast.success('Template eliminado')
      setConfirmDel(null)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error al eliminar')
    }
  }

  // Block editing helpers
  const addBloque = () => {
    if (!editing) return
    const last = editing.bloques[editing.bloques.length - 1]
    const nextStart = last ? last.hora_fin : '09:00'
    setEditing({
      ...editing,
      bloques: [...editing.bloques, { ...emptyBloque, hora_inicio: nextStart, hora_fin: addHour(nextStart) }],
    })
  }
  const updateBloque = (idx: number, patch: Partial<BloqueDraft>) => {
    if (!editing) return
    const next = [...editing.bloques]
    next[idx] = { ...next[idx], ...patch }
    setEditing({ ...editing, bloques: next })
  }
  const removeBloque = (idx: number) => {
    if (!editing) return
    setEditing({ ...editing, bloques: editing.bloques.filter((_, i) => i !== idx) })
  }
  const moveBloque = (idx: number, dir: -1 | 1) => {
    if (!editing) return
    const next = [...editing.bloques]
    const tgt = idx + dir
    if (tgt < 0 || tgt >= next.length) return
    ;[next[idx], next[tgt]] = [next[tgt], next[idx]]
    setEditing({ ...editing, bloques: next })
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 overflow-y-auto">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex flex-col gap-2 min-w-0">
          <span className="eyebrow-line">Equipo · Metodologías</span>
          <h1
            className="font-serif-display leading-none m-0"
            style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', color: 'var(--text-primary)' }}
          >
            Templates DMO
          </h1>
          <p className="text-sm m-0" style={{ color: 'var(--ink-4)' }}>
            Rutinas diarias que pueden seguir los vendedores
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold text-white active:scale-95 transition-all duration-200"
            style={{ backgroundColor: 'var(--navy-800)', border: '1px solid var(--navy-800)' }}
          >
            <Plus className="h-4 w-4" /> Nuevo template
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border p-4 animate-fade-in-up"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-2 flex-1 rounded-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: t.es_default_inmobiliaria ? 'var(--color-accent)' : 'var(--border-color)',
                boxShadow: t.es_default_inmobiliaria ? '0 0 0 1px var(--color-accent)' : 'none',
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold">{t.nombre}</h3>
                    {t.es_default_inmobiliaria && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold"
                            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}>
                        <Star className="h-3 w-3" /> Default
                      </span>
                    )}
                    {t.mercado && (
                      <span className="text-xs px-2 py-0.5 rounded font-mono"
                            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        {t.mercado}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Coach: <span className="font-semibold">{t.coach_nombre || '—'}</span> ·
                    {' '}{t.bloques.length} bloques ·
                    {' '}{t.asignaciones_count ?? 0} asignaciones
                  </p>
                </div>
              </div>
              {t.descripcion && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {t.descripcion}
                </p>
              )}

              <div className="space-y-1.5 mb-3">
                {t.bloques.slice(0, 6).map((b) => (
                  <div key={b.id} className="flex items-center gap-2 text-xs">
                    <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {b.hora_inicio.slice(0, 5)}
                    </span>
                    <span className="truncate flex-1">{b.nombre}</span>
                    {b.es_money_block && <Flame className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--color-flame)' }} />}
                  </div>
                ))}
              </div>

              {canEdit && (
                <div className="flex items-center justify-end gap-1 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <button
                    onClick={() => clone(t)}
                    className="p-1.5 rounded hover:bg-black/5 transition-all duration-200 active:scale-95"
                    title="Clonar"
                  >
                    <Copy className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded hover:bg-black/5 transition-all duration-200 active:scale-95"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    onClick={() => setConfirmDel(t)}
                    className="p-1.5 rounded hover:bg-black/5 transition-all duration-200 active:scale-95"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" style={{ color: 'var(--color-danger)' }} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <SideModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? 'Editar template' : 'Nuevo template'}
        subtitle="Rutina diaria del vendedor"
        width="xl"
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre">
                <input
                  value={editing.nombre}
                  onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </Field>
              <Field label="Coach">
                <select
                  value={editing.coach_id ?? ''}
                  onChange={(e) => setEditing({ ...editing, coach_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <option value="">— elegir —</option>
                  {coaches.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Descripcion">
              <textarea
                value={editing.descripcion}
                onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Mercado">
                <input
                  value={editing.mercado}
                  onChange={(e) => setEditing({ ...editing, mercado: e.target.value })}
                  placeholder="AR, USA, LATAM..."
                  className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </Field>
              <label className="flex items-end gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={editing.activo}
                  onChange={(e) => setEditing({ ...editing, activo: e.target.checked })}
                />
                Activo
              </label>
              <label className="flex items-end gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={editing.es_default_inmobiliaria}
                  onChange={(e) => setEditing({ ...editing, es_default_inmobiliaria: e.target.checked })}
                />
                Default oficina
              </label>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Bloques del dia</h4>
                <button
                  onClick={addBloque}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <Plus className="h-3 w-3" /> Agregar bloque
                </button>
              </div>
              <div className="space-y-2">
                {editing.bloques.map((b, idx) => (
                  <BloqueEditor
                    key={idx}
                    bloque={b}
                    onChange={(p) => updateBloque(idx, p)}
                    onRemove={() => removeBloque(idx)}
                    onUp={() => moveBloque(idx, -1)}
                    onDown={() => moveBloque(idx, 1)}
                    isFirst={idx === 0}
                    isLast={idx === editing.bloques.length - 1}
                  />
                ))}
                {editing.bloques.length === 0 && (
                  <div className="text-center py-6 text-sm border-2 border-dashed rounded-lg"
                       style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                    Agregá al menos un bloque
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SideModal>

      <ConfirmModal
        isOpen={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
        title="Eliminar template"
        message="¿Eliminar este template? Si tiene vendedores asignados, primero reasignalos."
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

function BloqueEditor({
  bloque, onChange, onRemove, onUp, onDown, isFirst, isLast,
}: {
  bloque: BloqueDraft
  onChange: (p: Partial<BloqueDraft>) => void
  onRemove: () => void
  onUp: () => void
  onDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const isMoneyBlock = bloque.es_money_block
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        backgroundColor: 'var(--bg-app)',
        borderColor: isMoneyBlock ? 'var(--color-flame)' : 'var(--border-color)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <GripVertical className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
        <input
          value={bloque.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          placeholder="Nombre del bloque"
          className="flex-1 px-2 py-1 rounded border bg-transparent text-sm font-semibold"
          style={{ borderColor: 'var(--border-color)' }}
        />
        <button onClick={onUp} disabled={isFirst} className="p-1 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
        <button onClick={onDown} disabled={isLast} className="p-1 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
        <button onClick={onRemove} className="p-1"><Trash2 className="h-4 w-4" style={{ color: 'var(--color-danger)' }} /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <input
          type="time"
          value={bloque.hora_inicio.slice(0, 5)}
          onChange={(e) => onChange({ hora_inicio: e.target.value + ':00' })}
          className="px-2 py-1 rounded border bg-transparent text-xs"
          style={{ borderColor: 'var(--border-color)' }}
        />
        <input
          type="time"
          value={bloque.hora_fin.slice(0, 5)}
          onChange={(e) => onChange({ hora_fin: e.target.value + ':00' })}
          className="px-2 py-1 rounded border bg-transparent text-xs"
          style={{ borderColor: 'var(--border-color)' }}
        />
        <input
          type="color"
          value={bloque.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="px-1 py-0.5 rounded border bg-transparent h-7"
          style={{ borderColor: 'var(--border-color)' }}
        />
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={bloque.es_money_block}
            onChange={(e) => onChange({ es_money_block: e.target.checked })}
          />
          <Flame className="h-3 w-3" style={{ color: 'var(--color-flame)' }} /> Money Block
        </label>
      </div>
      <textarea
        value={bloque.descripcion ?? ''}
        onChange={(e) => onChange({ descripcion: e.target.value })}
        placeholder="Descripcion / instrucciones del bloque"
        rows={2}
        className="w-full px-2 py-1 rounded border bg-transparent text-xs mb-2"
        style={{ borderColor: 'var(--border-color)' }}
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          value={bloque.metrica_tipo}
          onChange={(e) => onChange({ metrica_tipo: e.target.value as MetricaTipo })}
          className="px-2 py-1 rounded border bg-transparent text-xs"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <option value="checkbox">Solo check</option>
          <option value="cantidad">Cantidad</option>
        </select>
        <input
          value={bloque.metrica_label ?? ''}
          onChange={(e) => onChange({ metrica_label: e.target.value })}
          placeholder="ej: Conversaciones"
          disabled={bloque.metrica_tipo === 'checkbox'}
          className="px-2 py-1 rounded border bg-transparent text-xs disabled:opacity-40"
          style={{ borderColor: 'var(--border-color)' }}
        />
        <input
          type="number"
          min="0"
          value={bloque.metrica_meta}
          onChange={(e) => onChange({ metrica_meta: parseInt(e.target.value) || 0 })}
          placeholder="Meta"
          disabled={bloque.metrica_tipo === 'checkbox'}
          className="px-2 py-1 rounded border bg-transparent text-xs disabled:opacity-40"
          style={{ borderColor: 'var(--border-color)' }}
        />
      </div>
    </div>
  )
}

function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const tot = (h * 60 + m + 60) % (24 * 60)
  const nh = Math.floor(tot / 60)
  const nm = tot % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:00`
}
