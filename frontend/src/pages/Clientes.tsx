import { useEffect, useMemo, useState } from 'react'
import { Users, Phone, Mail, Mic } from 'lucide-react'
import { toast } from 'sonner'
import { ABMPage } from '../components/ui/ABMPage'
import { ABMTable, ABMColumn } from '../components/ui/ABMTable'
import { SideModal } from '../components/SideModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { VoiceInputButton } from '../components/VoiceInputButton'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonTable } from '../components/ui/Skeleton'
import { clientesAPI } from '../services/api'
import type { Cliente } from '../types'

const ESTADO_COLOR: Record<string, string> = {
  nuevo: 'bg-blue-100 text-blue-700',
  contactado: 'bg-cyan-100 text-cyan-700',
  calificado: 'bg-purple-100 text-purple-700',
  cita: 'bg-yellow-100 text-yellow-700',
  propuesta: 'bg-orange-100 text-orange-700',
  cerrado: 'bg-green-100 text-green-700',
  perdido: 'bg-red-100 text-red-700',
}

const TEMP_COLOR: Record<string, string> = {
  caliente: 'bg-red-500 text-white',
  tibio: 'bg-orange-400 text-white',
  frio: 'bg-blue-400 text-white',
}

const empty: Partial<Cliente> = {
  nombre: '', apellido: '', email: '', telefono: '',
  origen: 'web', estado: 'nuevo',
  pref_zona: '', pref_m2_min: undefined, pref_m2_max: undefined,
  pref_ambientes: undefined, pref_presupuesto_min: undefined, pref_presupuesto_max: undefined,
  pref_moneda: 'USD', notas: '',
}

export function Clientes() {
  const [data, setData] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Partial<Cliente> | null>(null)
  const [confirming, setConfirming] = useState<Cliente | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await clientesAPI.list()
      setData(r.data)
    } catch { toast.error('Error al cargar clientes') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = data.filter((c) => {
    const q = search.toLowerCase()
    return c.nombre.toLowerCase().includes(q) ||
           c.apellido.toLowerCase().includes(q) ||
           (c.email ?? '').toLowerCase().includes(q) ||
           (c.telefono ?? '').includes(q)
  })

  const columns: ABMColumn<Cliente>[] = [
    { key: 'nombre', header: 'Nombre', sortable: true, sortValue: (c) => c.nombre, render: (c) => <span className="font-semibold">{c.nombre} {c.apellido}</span> },
    { key: 'contacto', header: 'Contacto', render: (c) => (
      <div className="space-y-0.5 text-xs">
        {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-[var(--text-secondary)]" />{c.email}</div>}
        {c.telefono && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-[var(--text-secondary)]" />{c.telefono}</div>}
      </div>
    ) },
    { key: 'origen', header: 'Origen', render: (c) => <span className="text-xs uppercase">{c.origen}</span> },
    { key: 'estado', header: 'Estado', render: (c) => (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${ESTADO_COLOR[c.estado] ?? 'bg-gray-100 text-gray-700'}`}>{c.estado}</span>
    ) },
    { key: 'temperatura', header: 'Temp.', render: (c) => c.temperatura ? (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${TEMP_COLOR[c.temperatura] ?? ''}`}>{c.temperatura}</span>
    ) : <span className="text-xs text-[var(--text-secondary)]">—</span> },
    { key: 'pref_zona', header: 'Busca en', render: (c) => c.pref_zona ?? '—' },
    { key: 'vendedor', header: 'Vendedor', render: (c) => c.vendedor_nombre ?? '—' },
  ]

  const submit = async () => {
    if (!editing) return
    try {
      if (editing.id) {
        await clientesAPI.update(editing.id, editing)
        toast.success('Cliente actualizado')
      } else {
        await clientesAPI.create(editing)
        toast.success('Cliente creado')
      }
      setEditing(null)
      load()
    } catch { toast.error('Error al guardar') }
  }

  const handleDelete = async () => {
    if (!confirming) return
    try {
      await clientesAPI.remove(confirming.id)
      toast.success('Cliente eliminado')
      setConfirming(null)
      load()
    } catch { toast.error('No se pudo eliminar') }
  }

  const contextData = useMemo(() => {
    const now = Date.now()
    const dias = (iso: string | null | undefined) =>
      iso ? Math.floor((now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)) : 999
    const calientes_sin_contactar_3d = data
      .filter((c) => c.temperatura === 'caliente' && dias(c.last_contact_at) > 3)
      .slice(0, 5)
      .map((c) => ({ id: c.id, nombre: `${c.nombre} ${c.apellido}`, tel: c.telefono, dias_sin_contacto: dias(c.last_contact_at) }))
    return {
      filtro_aplicado: { busqueda: search || null },
      total_visibles: filtered.length,
      total: data.length,
      calientes_sin_contactar_3d,
      tibios_viejos: data.filter((c) => c.temperatura === 'tibio' && dias(c.last_contact_at) > 14).length,
      nuevos_sin_contactar_1h: data.filter((c) => c.estado === 'nuevo' && dias(c.last_contact_at) > 0).length,
    }
  }, [data, filtered, search])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6">
      <ABMPage
        title="Clientes"
        icon={<Users className="h-6 w-6" />}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, email, telefono..."
        onAdd={() => setEditing({ ...empty })}
        loading={false}
        isEmpty={!loading && filtered.length === 0}
      >
        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : (
          <ABMTable
            data={filtered}
            columns={columns}
            keyExtractor={(c) => c.id}
            onEdit={(c) => setEditing({ ...c })}
            onDelete={setConfirming}
          />
        )}
      </ABMPage>

      <SideModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar cliente' : 'Nuevo cliente'}
        subtitle="Datos de contacto + preferencias de búsqueda"
        stickyFooter={
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-[var(--border-color)]">Cancelar</button>
            <button onClick={submit} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white active:scale-95 transition-all duration-200">Guardar</button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input value={editing.nombre ?? ''} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apellido</label>
                <input value={editing.apellido ?? ''} onChange={(e) => setEditing({ ...editing, apellido: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input value={editing.telefono ?? ''} onChange={(e) => setEditing({ ...editing, telefono: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Origen</label>
                <select value={editing.origen ?? 'web'} onChange={(e) => setEditing({ ...editing, origen: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                  {['web', 'walk_in', 'referido', 'zonaprop', 'argenprop', 'redes', 'otro'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select value={editing.estado ?? 'nuevo'} onChange={(e) => setEditing({ ...editing, estado: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                  {['nuevo', 'contactado', 'calificado', 'cita', 'propuesta', 'cerrado', 'perdido'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="border-t border-[var(--border-color)] pt-3">
              <h4 className="text-sm font-semibold mb-2">Preferencias de búsqueda</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1">Zona</label>
                  <input value={editing.pref_zona ?? ''} onChange={(e) => setEditing({ ...editing, pref_zona: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
                </div>
                <div>
                  <label className="block text-xs mb-1">Ambientes</label>
                  <input type="number" value={editing.pref_ambientes ?? ''} onChange={(e) => setEditing({ ...editing, pref_ambientes: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
                </div>
                <div>
                  <label className="block text-xs mb-1">m² min</label>
                  <input type="number" value={editing.pref_m2_min ?? ''} onChange={(e) => setEditing({ ...editing, pref_m2_min: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
                </div>
                <div>
                  <label className="block text-xs mb-1">m² max</label>
                  <input type="number" value={editing.pref_m2_max ?? ''} onChange={(e) => setEditing({ ...editing, pref_m2_max: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
                </div>
                <div>
                  <label className="block text-xs mb-1">Presup. min (USD)</label>
                  <input type="number" value={editing.pref_presupuesto_min ?? ''} onChange={(e) => setEditing({ ...editing, pref_presupuesto_min: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
                </div>
                <div>
                  <label className="block text-xs mb-1">Presup. max (USD)</label>
                  <input type="number" value={editing.pref_presupuesto_max ?? ''} onChange={(e) => setEditing({ ...editing, pref_presupuesto_max: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]" />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Notas</label>
                <VoiceInputButton
                  onTranscript={(t) => setEditing({ ...editing, notas: (editing.notas ?? '') + (editing.notas ? ' ' : '') + t })}
                  onError={(m) => toast.error(m)}
                />
              </div>
              <textarea
                rows={4}
                value={editing.notas ?? ''}
                onChange={(e) => setEditing({ ...editing, notas: e.target.value })}
                placeholder="Notas (podés dictar con el botón de microfono)"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]"
              />
            </div>
          </div>
        )}
      </SideModal>

      <ConfirmModal
        isOpen={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
        message={confirming ? `¿Eliminar a ${confirming.nombre} ${confirming.apellido}? Esta acción es irreversible.` : ''}
        variant="danger"
        confirmLabel="Eliminar"
      />
      </div>
      <AICoachPanel screen="clientes" contextData={contextData} />
    </div>
  )
}
