import { useEffect, useMemo, useState } from 'react'
import { Building2, MapPin, BedDouble, Maximize, Car } from 'lucide-react'
import { toast } from 'sonner'
import { ABMPage } from '../components/ui/ABMPage'
import { ConfirmModal } from '../components/ConfirmModal'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonGrid } from '../components/ui/Skeleton'
import { propiedadesAPI } from '../services/api'
import type { Propiedad } from '../types'

const ESTADO_COLOR_BG: Record<string, string> = {
  captada:    'var(--color-blue)',
  publicada:  'var(--color-success)',
  reservada:  'var(--color-warning)',
  vendida:    'var(--color-accent)',
  retirada:   'var(--color-danger)',
}

function PropCard({ p, onDelete }: { p: Propiedad; onDelete: (p: Propiedad) => void }) {
  const thumb = p.fotos[0]?.url ?? `https://picsum.photos/seed/prop${p.id}/600/400`
  const accent = ESTADO_COLOR_BG[p.estado] ?? 'var(--text-secondary)'
  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl animate-fade-in-up group relative"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accent }} />
      <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
        <img
          src={thumb}
          alt={p.titulo}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span
          className="absolute top-2 left-3 text-[10px] uppercase font-bold px-2 py-1 rounded backdrop-blur"
          style={{ backgroundColor: `${accent}cc`, color: '#fff' }}
        >
          {p.estado}
        </span>
        {p.exclusividad && (
          <span
            className="absolute top-2 right-2 text-[10px] uppercase font-bold px-2 py-1 rounded"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
              color: 'var(--color-primary)',
            }}
          >
            Exclusiva
          </span>
        )}
      </div>
      <div className="flex-1 p-3 pl-4 space-y-2">
        <h3 className="font-semibold leading-tight line-clamp-2">{p.titulo}</h3>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <MapPin className="h-3 w-3" />
          {p.direccion}, {p.barrio}
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1"><Maximize className="h-3 w-3" />{p.m2_totales}m²</span>
          <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{p.ambientes} amb</span>
          {p.cocheras > 0 && <span className="flex items-center gap-1"><Car className="h-3 w-3" />{p.cocheras}</span>}
        </div>
        <div className="flex items-end justify-between pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>
              {p.moneda} {p.precio_publicacion.toLocaleString()}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {p.captador_nombre ?? '—'}
            </div>
          </div>
          <button
            onClick={() => onDelete(p)}
            className="text-xs px-2 py-1 rounded border transition-all duration-200 active:scale-95"
            style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
          >
            Quitar
          </button>
        </div>
      </div>
    </div>
  )
}

export function Propiedades() {
  const [data, setData] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState<Propiedad | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await propiedadesAPI.list()
      setData(r.data)
    } catch { toast.error('Error al cargar propiedades') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = data.filter((p) => {
    const q = search.toLowerCase()
    return p.titulo.toLowerCase().includes(q) ||
           p.barrio.toLowerCase().includes(q) ||
           p.direccion.toLowerCase().includes(q)
  })

  const handleDelete = async () => {
    if (!confirming) return
    try {
      await propiedadesAPI.remove(confirming.id)
      toast.success('Propiedad eliminada')
      setConfirming(null)
      load()
    } catch { toast.error('No se pudo eliminar') }
  }

  const contextData = useMemo(() => {
    const now = Date.now()
    const dias = (iso: string) => Math.floor((now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
    const estancadas = data
      .filter((p) => dias(p.created_at) > 30 && ['publicada', 'captada'].includes(p.estado))
      .slice(0, 5)
      .map((p) => ({ id: p.id, titulo: p.titulo, barrio: p.barrio, dias_publicada: dias(p.created_at), precio: p.precio_publicacion }))
    return {
      filtro: { busqueda: search || null },
      total_visibles: filtered.length,
      propiedades_estancadas_30d: estancadas,
      total_publicadas: data.filter((p) => p.estado === 'publicada').length,
    }
  }, [data, filtered, search])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6">
        <ABMPage
          title="Propiedades"
          icon={<Building2 className="h-6 w-6" />}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por titulo, barrio, direccion..."
          loading={false}
          isEmpty={!loading && filtered.length === 0}
          buttonLabel="Nueva propiedad"
          onAdd={() => toast.info('Alta de propiedad: pendiente (demo)')}
        >
          {loading ? (
            <SkeletonGrid count={6} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p, i) => (
                <div key={p.id} style={{ animationDelay: `${i * 30}ms` }}>
                  <PropCard p={p} onDelete={setConfirming} />
                </div>
              ))}
            </div>
          )}
        </ABMPage>

        <ConfirmModal
          isOpen={!!confirming}
          onClose={() => setConfirming(null)}
          onConfirm={handleDelete}
          title="Eliminar propiedad"
          message={confirming ? `¿Eliminar "${confirming.titulo}"?` : ''}
          variant="danger"
          confirmLabel="Eliminar"
        />
      </div>
      <AICoachPanel screen="propiedades" contextData={contextData} />
    </div>
  )
}
