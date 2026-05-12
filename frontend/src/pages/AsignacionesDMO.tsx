import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { UserCog, GraduationCap, Star } from 'lucide-react'
import { dmoAssignmentsAPI, dmoTemplatesAPI, usersAPI } from '../services/api'
import { SkeletonTable } from '../components/ui/Skeleton'
import { ModernSelect } from '../components/ui/ModernSelect'
import { useAuth } from '../contexts/AuthContext'
import type { DmoTemplate, User, VendedorAssignment } from '../types'

export function AsignacionesDMO() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'gerente'
  const [vendedores, setVendedores] = useState<User[]>([])
  const [templates, setTemplates] = useState<DmoTemplate[]>([])
  const [assignments, setAssignments] = useState<VendedorAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [u, t, a] = await Promise.all([
        usersAPI.list(),
        dmoTemplatesAPI.list(),
        dmoAssignmentsAPI.list(),
      ])
      setVendedores(u.data.filter((x: User) => x.role === 'vendedor'))
      setTemplates(t.data.filter((x: DmoTemplate) => x.activo))
      setAssignments(a.data)
    } catch { toast.error('Error al cargar asignaciones') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const defaultTemplate = useMemo(() => templates.find((t) => t.es_default_inmobiliaria), [templates])
  const asignByVendedor = useMemo(() => {
    const m = new Map<number, VendedorAssignment>()
    assignments.forEach((a) => m.set(a.vendedor_id, a))
    return m
  }, [assignments])

  const assign = async (vendedor_id: number, template_id: number | null) => {
    if (!template_id) {
      try {
        await dmoAssignmentsAPI.remove(vendedor_id)
        toast.success('Asignacion eliminada (usara el default)')
        load()
      } catch { toast.error('Error al desasignar') }
      return
    }
    try {
      await dmoAssignmentsAPI.upsert({ vendedor_id, template_id })
      toast.success('Asignacion guardada')
      load()
    } catch { toast.error('Error al asignar') }
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-2">
        <UserCog className="h-6 w-6" style={{ color: 'var(--color-accent)' }} />
        <div>
          <h1 className="text-2xl font-bold">Asignaciones DMO</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Que rutina diaria sigue cada vendedor
          </p>
        </div>
      </div>

      {defaultTemplate && (
        <div
          className="mt-4 mb-6 flex items-center gap-3 p-3 rounded-lg border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--color-accent)' }}
        >
          <Star className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
          <div className="text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Template default de la inmobiliaria:</span>{' '}
            <span className="font-semibold">{defaultTemplate.nombre}</span>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>
              (se usa cuando un vendedor no tiene asignacion explicita)
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : (
        <div className="rounded-xl border overflow-hidden"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                <th className="text-left px-4 py-3 font-semibold">Vendedor</th>
                <th className="text-left px-4 py-3 font-semibold">Coach</th>
                <th className="text-left px-4 py-3 font-semibold">Template asignado</th>
                <th className="text-left px-4 py-3 font-semibold">Meta diaria</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v) => {
                const a = asignByVendedor.get(v.id)
                const currentId = a?.template_id ?? defaultTemplate?.id ?? null
                const current = templates.find((t) => t.id === currentId)
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
                      <div className="flex items-center gap-1.5 text-xs">
                        <GraduationCap className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} />
                        <span>{current?.coach_nombre ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <ModernSelect
                          value={a?.template_id ? String(a.template_id) : ''}
                          onChange={(val) => assign(v.id, val ? Number(val) : null)}
                          disabled={!canEdit}
                          placeholder="— Usar default —"
                          options={[
                            { value: '', label: '— Usar default —', description: defaultTemplate?.nombre },
                            ...templates.map((t) => ({
                              value: String(t.id),
                              label: t.nombre,
                              description: t.coach_nombre ?? undefined,
                              ...(t.es_default_inmobiliaria ? { color: 'var(--color-accent)' } : {}),
                            })),
                          ]}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {v.meta_conversaciones_diaria} conv/dia
                    </td>
                  </tr>
                )
              })}
              {vendedores.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
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
