import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Users, Smartphone, Circle, Save } from 'lucide-react'
import { usersAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types'

export function Equipo() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'gerente'
  const [vendedores, setVendedores] = useState<User[]>([])
  const [drafts, setDrafts] = useState<Record<number, Partial<User>>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)

  const load = async () => {
    try {
      const r = await usersAPI.list()
      setVendedores(r.data.filter((u: User) => u.role === 'vendedor'))
    } catch { toast.error('Error al cargar equipo') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const updateDraft = (id: number, patch: Partial<User>) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }))
  }

  const save = async (v: User) => {
    const patch = drafts[v.id]
    if (!patch || Object.keys(patch).length === 0) return
    setSavingId(v.id)
    try {
      await usersAPI.update(v.id, patch)
      toast.success(`${v.nombre}: guardado`)
      setDrafts((d) => { const { [v.id]: _, ...rest } = d; return rest })
      load()
    } catch { toast.error('Error al guardar') }
    finally { setSavingId(null) }
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 overflow-y-auto">
      <div className="flex flex-col gap-2 mb-6">
        <span className="eyebrow-line">Equipo · Operaciones</span>
        <h1
          className="font-serif-display leading-none m-0"
          style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', color: 'var(--text-primary)' }}
        >
          Equipo de vendedores
        </h1>
        <p className="text-sm m-0" style={{ color: 'var(--ink-4)' }}>
          Gestioná los WhatsApps de cada vendedor y su disponibilidad
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : (
        <div className="rounded-xl border overflow-hidden"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                <th className="text-left px-4 py-3 font-semibold">Vendedor</th>
                <th className="text-left px-4 py-3 font-semibold">WhatsApp personal</th>
                <th className="text-left px-4 py-3 font-semibold">Disponible</th>
                <th className="text-left px-4 py-3 font-semibold">Meta diaria</th>
                <th className="text-left px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v) => {
                const draft = drafts[v.id] || {}
                const tel = draft.telefono_personal !== undefined ? draft.telefono_personal : v.telefono_personal
                const avail = draft.is_available !== undefined ? draft.is_available : v.is_available
                const meta = draft.meta_conversaciones_diaria !== undefined ? draft.meta_conversaciones_diaria : v.meta_conversaciones_diaria
                const hasDraft = !!drafts[v.id]
                return (
                  <tr key={v.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}
                        >
                          {v.nombre[0]}{v.apellido[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{v.nombre} {v.apellido}</div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{v.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative max-w-xs">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                                    style={{ color: 'var(--text-secondary)' }} />
                        <input
                          type="text"
                          value={tel ?? ''}
                          onChange={(e) => updateDraft(v.id, { telefono_personal: e.target.value })}
                          disabled={!canEdit}
                          placeholder="+54 9 11 1234-5678"
                          className="w-full pl-10 pr-3 py-1.5 rounded-lg border bg-transparent text-sm disabled:opacity-60"
                          style={{ borderColor: 'var(--border-color)' }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => canEdit && updateDraft(v.id, { is_available: !avail })}
                        disabled={!canEdit}
                        className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60"
                        style={{
                          backgroundColor: avail ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-hover)',
                          color: avail ? 'var(--color-success)' : 'var(--text-secondary)',
                          border: `1px solid ${avail ? 'var(--color-success)' : 'var(--border-color)'}`,
                        }}
                      >
                        <Circle className="h-2.5 w-2.5"
                                fill={avail ? 'var(--color-success)' : 'var(--text-secondary)'}
                                strokeWidth={0} />
                        {avail ? 'Disponible' : 'Ocupado'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={meta}
                        onChange={(e) => updateDraft(v.id, { meta_conversaciones_diaria: parseInt(e.target.value) || 0 })}
                        disabled={!canEdit}
                        className="w-20 px-2 py-1 rounded border bg-transparent text-sm text-center disabled:opacity-60"
                        style={{ borderColor: 'var(--border-color)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {hasDraft && (
                        <button
                          onClick={() => save(v)}
                          disabled={savingId === v.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingId === v.id ? 'Guardando...' : 'Guardar'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {vendedores.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  No hay vendedores cargados.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
