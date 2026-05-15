import { useEffect, useMemo, useState } from 'react'
import { MapPin, BedDouble, Maximize, Car, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import {
  ABMPageClassic, ABMCardClassic, ABMBadgeClassic,
  type ViewMode, TOOLBAR_IMPORT, TOOLBAR_EXPORT,
} from '../components/ui/classic'
import { ConfirmModal } from '../components/ConfirmModal'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonGrid } from '../components/ui/Skeleton'
import { propiedadesAPI } from '../services/api'
import type { Propiedad } from '../types'

/* ----- Mock data ------ */

function mockProp(i: number, over: Partial<Propiedad>): Propiedad {
  return {
    id: -i,
    captador_id: 1,
    titulo: '',
    tipo: 'departamento',
    direccion: '',
    barrio: '',
    ciudad: 'CABA',
    m2_totales: 0,
    m2_cubiertos: 0,
    ambientes: 0,
    banos: 1,
    cocheras: 0,
    precio_publicacion: 0,
    moneda: 'USD',
    estado: 'publicada',
    exclusividad: false,
    fotos: [],
    captador_nombre: 'Patricio B.',
    created_at: new Date().toISOString(),
    ...over,
  } as Propiedad
}

const MOCK: Propiedad[] = [
  mockProp(1, { titulo: 'Departamento 3 amb · Belgrano R',  direccion: 'Av. Libertador 4820 · 3°B', barrio: 'Belgrano', estado: 'publicada', precio_publicacion: 245000, m2_totales: 78, ambientes: 3, cocheras: 1, exclusividad: true,  captador_nombre: 'Patricio B.' }),
  mockProp(2, { titulo: 'PH reciclado 2 amb',              direccion: 'Vidal 1944 · PH',           barrio: 'Núñez',    estado: 'reservada', precio_publicacion: 198000, m2_totales: 62, ambientes: 2, cocheras: 0, captador_nombre: 'Martín Cravero' }),
  mockProp(3, { titulo: 'Local comercial en esquina',      direccion: 'Av. Cabildo 2400',          barrio: 'Núñez',    estado: 'publicada', precio_publicacion: 320000, m2_totales: 110, ambientes: 0, cocheras: 0, exclusividad: true, captador_nombre: 'Florencia Reig' }),
  mockProp(4, { titulo: 'Casa 4 amb con jardín',           direccion: 'Arenales 2230',             barrio: 'Recoleta', estado: 'captada',   precio_publicacion: 410000, m2_totales: 145, ambientes: 4, cocheras: 2, captador_nombre: 'Andrés Bertelli' }),
  mockProp(5, { titulo: 'Loft 1 amb con terraza',          direccion: 'Honduras 5500',             barrio: 'Palermo',  estado: 'publicada', precio_publicacion: 138000, m2_totales: 42, ambientes: 1, cocheras: 0, captador_nombre: 'Lucía Sandoval' }),
  mockProp(6, { titulo: 'Departamento premium 4 amb',      direccion: 'Av. Alvear 1830',           barrio: 'Recoleta', estado: 'publicada', precio_publicacion: 580000, m2_totales: 165, ambientes: 4, cocheras: 2, exclusividad: true, captador_nombre: 'Lucía Sandoval' }),
]

/* ----- Helpers ------ */

const ESTADO_TONE: Record<string, 'cold'|'success'|'warning'|'gold'|'danger'|'neutral'> = {
  captada:    'cold',
  publicada:  'success',
  reservada:  'warning',
  vendida:    'gold',
  retirada:   'danger',
}

function formatPrice(moneda: string, n: number) {
  if (n >= 1000) return `${moneda} ${Math.round(n / 1000)}K`
  return `${moneda} ${n}`
}

/* ----- Página ------ */

export function Propiedades() {
  const [serverData, setServerData] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeChip, setActiveChip] = useState('todas')
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('propiedades:view') as ViewMode) || 'cards')
  const [confirming, setConfirming] = useState<Propiedad | null>(null)

  useEffect(() => { localStorage.setItem('propiedades:view', view) }, [view])

  const load = async () => {
    setLoading(true)
    try {
      const r = await propiedadesAPI.list()
      setServerData(r.data)
    } catch { toast.error('Error al cargar propiedades') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const usingMock = !loading && serverData.length === 0
  const data = usingMock ? MOCK : serverData

  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return data
    return data.filter((p) =>
      p.titulo.toLowerCase().includes(q) ||
      p.barrio.toLowerCase().includes(q) ||
      p.direccion.toLowerCase().includes(q),
    )
  }, [data, search])

  const counts = useMemo(() => ({
    todas:      baseFiltered.length,
    publicadas: baseFiltered.filter((p) => p.estado === 'publicada').length,
    exclusivas: baseFiltered.filter((p) => p.exclusividad).length,
    reservadas: baseFiltered.filter((p) => p.estado === 'reservada').length,
    captadas:   baseFiltered.filter((p) => p.estado === 'captada').length,
  }), [baseFiltered])

  const filtered = useMemo(() => {
    switch (activeChip) {
      case 'publicadas': return baseFiltered.filter((p) => p.estado === 'publicada')
      case 'exclusivas': return baseFiltered.filter((p) => p.exclusividad)
      case 'reservadas': return baseFiltered.filter((p) => p.estado === 'reservada')
      case 'captadas':   return baseFiltered.filter((p) => p.estado === 'captada')
      default:           return baseFiltered
    }
  }, [baseFiltered, activeChip])

  const handleDelete = async () => {
    if (!confirming) return
    if (confirming.id < 0) {
      toast.info('No se puede eliminar una propiedad demo')
      setConfirming(null)
      return
    }
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
      filtro: { busqueda: search || null, chip: activeChip },
      total_visibles: filtered.length,
      using_mock: usingMock,
      propiedades_estancadas_30d: estancadas,
      total_publicadas: data.filter((p) => p.estado === 'publicada').length,
    }
  }, [data, filtered, search, activeChip, usingMock])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6">
        <ABMPageClassic
          eyebrow="Cartera · Inventario"
          title="Propiedades"
          subtitleParts={[
            { strong: counts.todas,      label: 'propiedades en cartera' },
            { strong: counts.publicadas, label: 'publicadas' },
            { strong: counts.exclusivas, label: 'exclusivas' },
          ]}
          filterChips={[
            { key: 'todas',      label: 'Todas',      count: counts.todas },
            { key: 'publicadas', label: 'Publicadas', count: counts.publicadas },
            { key: 'exclusivas', label: 'Exclusivas', count: counts.exclusivas },
            { key: 'reservadas', label: 'Reservadas', count: counts.reservadas },
            { key: 'captadas',   label: 'Captadas',   count: counts.captadas },
          ]}
          activeChip={activeChip}
          onChipChange={setActiveChip}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por título, barrio, dirección..."
          toolbar={[
            { ...TOOLBAR_IMPORT, variant: 'outline', onClick: () => toast.info('Importar — próximamente') },
            { ...TOOLBAR_EXPORT, variant: 'outline', onClick: () => toast.info('Exportar — próximamente') },
          ]}
          onAdd={() => toast.info('Alta de propiedad — próximamente')}
          addLabel="Nueva propiedad"
          view={view}
          onViewChange={setView}
          loading={loading}
          isEmpty={!loading && filtered.length === 0}
          emptyMessage="No hay propiedades con esos filtros."
        >
          {loading ? (
            <SkeletonGrid count={6} />
          ) : view === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p, i) => (
                <ABMCardClassic
                  key={p.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: 'both' }}
                  avatar={{
                    initials: p.barrio.slice(0, 2),
                    tone: p.exclusividad ? 'gold' : 'navy',
                  }}
                  title={p.titulo}
                  subtitle={`${p.direccion} · ${p.barrio}`}
                  stats={[
                    { value: formatPrice(p.moneda, p.precio_publicacion), label: 'Precio' },
                    { value: `${p.m2_totales}m²`, label: 'Superficie' },
                    { value: `${p.ambientes}`,    label: 'Ambientes' },
                  ]}
                  footerText={
                    <span className="flex items-center gap-2 flex-wrap">
                      <ABMBadgeClassic label={p.estado} tone={ESTADO_TONE[p.estado] ?? 'neutral'} />
                      <ExclusividadBadge active={p.exclusividad} />
                      <span>· {p.captador_nombre ?? '—'}</span>
                    </span>
                  }
                  kebabItems={[
                    { icon: Trash2, label: 'Eliminar', onClick: () => setConfirming(p), tone: 'danger' },
                  ]}
                />
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl overflow-x-auto"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)' }}
            >
              <table className="w-full text-sm border-collapse" style={{ minWidth: 880 }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-3)' }}>
                    <th className="uppercase-label py-3 px-4 text-left">Propiedad</th>
                    <th className="uppercase-label py-3 px-4 text-left">Barrio</th>
                    <th className="uppercase-label py-3 px-4 text-right">Precio</th>
                    <th className="uppercase-label py-3 px-4 text-right">m²</th>
                    <th className="uppercase-label py-3 px-4 text-right">Amb</th>
                    <th className="uppercase-label py-3 px-4 text-left">Estado</th>
                    <th className="uppercase-label py-3 px-4 text-left">Exclusividad</th>
                    <th className="uppercase-label py-3 px-4 text-left">Captador</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                      <td className="py-3 px-4">
                        <div className="font-semibold flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--gold-500)' }} />
                          {p.titulo}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>{p.direccion}</div>
                      </td>
                      <td className="py-3 px-4">{p.barrio}</td>
                      <td className="py-3 px-4 font-mono-tnum text-right">{formatPrice(p.moneda, p.precio_publicacion)}</td>
                      <td className="py-3 px-4 font-mono-tnum text-right">{p.m2_totales}</td>
                      <td className="py-3 px-4 font-mono-tnum text-right">{p.ambientes}</td>
                      <td className="py-3 px-4">
                        <ABMBadgeClassic label={p.estado} tone={ESTADO_TONE[p.estado] ?? 'neutral'} />
                      </td>
                      <td className="py-3 px-4">
                        <ExclusividadBadge active={p.exclusividad} />
                      </td>
                      <td className="py-3 px-4">{p.captador_nombre ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ABMPageClassic>

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

/* Badge sutil para indicar exclusividad. Verde transparente con check
   cuando es exclusiva, gris muy tenue cuando no. */
function ExclusividadBadge({ active }: { active?: boolean }) {
  if (active) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          color: 'rgb(34, 197, 94)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
        }}
      >
        <CheckCircle2 className="h-3 w-3" />
        Exclusiva
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
      style={{
        backgroundColor: 'transparent',
        color: 'var(--ink-5)',
        border: '1px dashed var(--border-color)',
      }}
    >
      <Circle className="h-3 w-3 opacity-50" />
      Abierta
    </span>
  )
}
