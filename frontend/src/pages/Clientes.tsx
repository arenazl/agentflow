import { useEffect, useMemo, useState } from 'react'
import { Flame, Sun, Moon, MessageCircle, Phone, Mail, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  ABMPageClassic, ABMTableClassic, ABMCardClassic, ABMBadgeClassic,
  ABMAvatarClassic, ABMRowActions,
  type ABMColumnClassic, type ViewMode,
  TOOLBAR_IMPORT, TOOLBAR_EXPORT,
} from '../components/ui/classic'
import { SideModal } from '../components/SideModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { VoiceInputButton } from '../components/VoiceInputButton'
import { AICoachPanel } from '../components/AICoachPanel'
import { SkeletonTable } from '../components/ui/Skeleton'
import { clientesAPI } from '../services/api'
import type { Cliente } from '../types'

/* ------------ Mock data (se muestra cuando la API responde vacío) ----------- */

const MOCK_CLIENTES: Cliente[] = [
  // @ts-expect-error mock — los campos opcionales que faltan los maneja el render
  { id: -1, nombre: 'Juan', apellido: 'Pellegrini',    email: '', telefono: '+5491150010001', origen: 'zonaprop',  estado: 'cita',       temperatura: 'caliente', pref_zona: 'Belgrano · Núñez', pref_presupuesto_min: 180000, pref_presupuesto_max: 250000, pref_moneda: 'USD', vendedor_nombre: 'Patricio B.',  last_contact_at: new Date(Date.now() -  2 * 60 * 60 * 1000).toISOString() },
  // @ts-expect-error mock
  { id: -2, nombre: 'Familia', apellido: 'Vázquez',    email: '', telefono: '+5491150010002', origen: 'referido',  estado: 'propuesta',  temperatura: 'caliente', pref_zona: 'Belgrano',        pref_presupuesto_min: 240000, pref_presupuesto_max: 240000, pref_moneda: 'USD', vendedor_nombre: 'Patricio B.',  last_contact_at: new Date(Date.now() -  3 * 60 * 60 * 1000).toISOString() },
  // @ts-expect-error mock
  { id: -3, nombre: 'María',   apellido: 'Solís',      email: '', telefono: '+5491150010003', origen: 'web',       estado: 'cita',       temperatura: 'tibio',    pref_zona: 'Caballito',       pref_presupuesto_min: 130000, pref_presupuesto_max: 130000, pref_moneda: 'USD', vendedor_nombre: 'Patricio B.',  last_contact_at: new Date(Date.now() -  1 * 60 * 60 * 1000).toISOString() },
  // @ts-expect-error mock
  { id: -4, nombre: 'Lucía y M.', apellido: 'Argerich',email: '', telefono: '+5491150010004', origen: 'referido',  estado: 'calificado', temperatura: 'caliente', pref_zona: 'Caballito',       pref_presupuesto_min: 220000, pref_presupuesto_max: 280000, pref_moneda: 'USD', vendedor_nombre: 'Lucía Sandoval', last_contact_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() },
  // @ts-expect-error mock
  { id: -5, nombre: 'Estudio', apellido: 'Vrancken',   email: '', telefono: '+5491150010005', origen: 'argenprop', estado: 'propuesta',  temperatura: 'caliente', pref_zona: 'Núñez',           pref_presupuesto_min: 300000, pref_presupuesto_max: 350000, pref_moneda: 'USD', vendedor_nombre: 'Florencia Reig', last_contact_at: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString() },
  // @ts-expect-error mock
  { id: -6, nombre: 'Ramiro',  apellido: 'Padilla',    email: '', telefono: '+5491150010006', origen: 'zonaprop',  estado: 'nuevo',      temperatura: 'frio',     pref_zona: 'Núñez',           pref_presupuesto_min: 150000, pref_presupuesto_max: 180000, pref_moneda: 'USD', vendedor_nombre: 'Patricio B.',  last_contact_at: new Date(Date.now() -  3 * 24 * 60 * 60 * 1000).toISOString() },
  // @ts-expect-error mock
  { id: -7, nombre: 'Carolina',apellido: 'Beltrán',    email: '', telefono: '+5491150010007', origen: 'redes',     estado: 'calificado', temperatura: 'tibio',    pref_zona: 'Belgrano',        pref_presupuesto_min: 180000, pref_presupuesto_max: 210000, pref_moneda: 'USD', vendedor_nombre: 'Martín Cravero', last_contact_at: new Date(Date.now() -  2 * 24 * 60 * 60 * 1000).toISOString() },
  // @ts-expect-error mock
  { id: -8, nombre: 'Sebastián',apellido: 'Gianoli',   email: '', telefono: '+5491150010008', origen: 'walk_in',   estado: 'contactado', temperatura: 'tibio',    pref_zona: 'Palermo · Soho',  pref_presupuesto_min: undefined, pref_presupuesto_max: undefined, pref_moneda: 'USD', vendedor_nombre: 'Patricio B.', last_contact_at: new Date(Date.now() -  4 * 24 * 60 * 60 * 1000).toISOString() },
  // @ts-expect-error mock
  { id: -9, nombre: 'Agustina',apellido: 'Pesce',      email: '', telefono: '+5491150010009', origen: 'web',       estado: 'nuevo',      temperatura: 'tibio',    pref_zona: 'Caballito',       pref_presupuesto_min: undefined, pref_presupuesto_max: undefined, pref_moneda: 'USD', vendedor_nombre: 'Lucía Sandoval', last_contact_at: new Date(Date.now() -  4 * 24 * 60 * 60 * 1000).toISOString() },
  // @ts-expect-error mock
  { id:-10, nombre: 'Daniela', apellido: 'Cattáneo',   email: '', telefono: '+5491150010010', origen: 'referido',  estado: 'cita',       temperatura: 'caliente', pref_zona: 'Recoleta',        pref_presupuesto_min: 380000, pref_presupuesto_max: 450000, pref_moneda: 'USD', vendedor_nombre: 'Andrés Bertelli', last_contact_at: new Date(Date.now() -  1 * 24 * 60 * 60 * 1000).toISOString() },
]

/* ------------ Helpers ------------------------------------------------------ */

function initialsOf(nombre: string, apellido: string) {
  return `${(nombre[0] ?? '')}${(apellido[0] ?? '')}`.toUpperCase()
}

function relativeTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (diffH < 12) return `hoy  ${hhmm}`
  if (diffD === 1) return 'ayer'
  if (diffD < 7) return `hace ${diffD}d`
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function formatBudget(min?: number | null, max?: number | null, moneda: string = 'USD'): string {
  if (!min && !max) return '—'
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}K`
    return `${n}`
  }
  if (min && max && min !== max) return `${moneda} ${fmt(min)}-${fmt(max)}`
  return `${moneda} ${fmt((max ?? min)!)}`
}

function tipoFromOrigen(origen: string): string {
  if (origen === 'walk_in') return 'Propietario'
  if (origen === 'argenprop' || origen === 'zonaprop' || origen === 'ml') return 'Comprador'
  return 'Comprador'
}

function subFromOrigen(origen: string): string {
  const m: Record<string, string> = {
    zonaprop:  'ZonaProp',
    argenprop: 'Argenprop',
    ml:        'ML',
    web:       'Web',
    walk_in:   'Cold call',
    referido:  'Referido',
    redes:     'Redes',
    otro:      'Otro',
  }
  return m[origen] ?? '—'
}

const TEMP_BADGE: Record<string, { tone: 'hot'|'warm'|'cold'; icon: typeof Flame; label: string }> = {
  caliente: { tone: 'hot',  icon: Flame, label: 'Caliente' },
  tibio:    { tone: 'warm', icon: Sun,   label: 'Tibio'    },
  frio:     { tone: 'cold', icon: Moon,  label: 'Frío'     },
}

const ETAPA_BADGE: Record<string, { tone: 'navy'|'gold'|'success'|'neutral'; label: string }> = {
  nuevo:      { tone: 'neutral', label: 'Lead'       },
  contactado: { tone: 'neutral', label: 'En cartera' },
  calificado: { tone: 'navy',    label: 'Calificado' },
  cita:       { tone: 'gold',    label: 'Visita'     },
  propuesta:  { tone: 'gold',    label: 'Reserva'    },
  cerrado:    { tone: 'success', label: 'Cerrado'    },
  perdido:    { tone: 'neutral', label: 'Perdido'    },
}

/* ------------ Página ------------------------------------------------------- */

const empty: Partial<Cliente> = {
  nombre: '', apellido: '', email: '', telefono: '',
  origen: 'web', estado: 'nuevo',
  pref_zona: '', pref_m2_min: undefined, pref_m2_max: undefined,
  pref_ambientes: undefined, pref_presupuesto_min: undefined, pref_presupuesto_max: undefined,
  pref_moneda: 'USD', notas: '',
}

export function Clientes() {
  const [serverData, setServerData] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeChip, setActiveChip] = useState('todos')
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('clientes:view') as ViewMode) || 'table')
  const [editing, setEditing] = useState<Partial<Cliente> | null>(null)
  const [confirming, setConfirming] = useState<Cliente | null>(null)

  useEffect(() => { localStorage.setItem('clientes:view', view) }, [view])

  const load = async () => {
    setLoading(true)
    try {
      const r = await clientesAPI.list()
      setServerData(r.data)
    } catch { toast.error('Error al cargar clientes') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // Fallback dummy: si la API devuelve vacío, mostramos mock visualmente
  const usingMock = !loading && serverData.length === 0
  const data: Cliente[] = usingMock ? MOCK_CLIENTES : serverData

  /* --- Filtros --- */
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter((c) =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.telefono ?? '').includes(q),
    )
  }, [data, search])

  const counts = useMemo(() => {
    const calientes = baseFiltered.filter((c) => c.temperatura === 'caliente').length
    const mis = baseFiltered.length // sin datos de userId, mostramos todos como "míos"
    const sin7d = baseFiltered.filter((c) => {
      if (!c.last_contact_at) return true
      return (Date.now() - new Date(c.last_contact_at).getTime()) / 86400000 > 7
    }).length
    const enCierre = baseFiltered.filter((c) => c.estado === 'propuesta' || c.estado === 'cerrado').length
    return { todos: baseFiltered.length, calientes, mis, sin7d, enCierre }
  }, [baseFiltered])

  const filtered = useMemo(() => {
    switch (activeChip) {
      case 'calientes':  return baseFiltered.filter((c) => c.temperatura === 'caliente')
      case 'mis':        return baseFiltered
      case 'sin-7d':     return baseFiltered.filter((c) => {
        if (!c.last_contact_at) return true
        return (Date.now() - new Date(c.last_contact_at).getTime()) / 86400000 > 7
      })
      case 'cierre':     return baseFiltered.filter((c) => c.estado === 'propuesta' || c.estado === 'cerrado')
      default:           return baseFiltered
    }
  }, [baseFiltered, activeChip])

  /* --- Columnas tabla --- */
  const columns: ABMColumnClassic<Cliente>[] = [
    {
      key: 'cliente',
      header: 'Cliente',
      sortable: true,
      sortValue: (c) => `${c.apellido} ${c.nombre}`,
      render: (c) => (
        <div className="flex items-center gap-3">
          <ABMAvatarClassic initials={initialsOf(c.nombre, c.apellido)} size="md" />
          <div className="min-w-0">
            <div className="font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {c.nombre} {c.apellido}
            </div>
            <div className="text-xs leading-tight" style={{ color: 'var(--ink-4)' }}>
              {subFromOrigen(c.origen)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (c) => <span style={{ color: 'var(--text-primary)' }}>{tipoFromOrigen(c.origen)}</span>,
    },
    {
      key: 'presupuesto',
      header: 'Presupuesto',
      numeric: true,
      render: (c) => (
        <span style={{ color: 'var(--text-primary)' }}>
          {formatBudget(c.pref_presupuesto_min, c.pref_presupuesto_max, c.pref_moneda ?? 'USD')}
        </span>
      ),
    },
    {
      key: 'zona',
      header: 'Zona',
      render: (c) => <span style={{ color: 'var(--text-primary)' }}>{c.pref_zona || '—'}</span>,
    },
    {
      key: 'temperatura',
      header: 'Temperatura',
      render: (c) => {
        const t = c.temperatura ? TEMP_BADGE[c.temperatura] : null
        return t ? <ABMBadgeClassic label={t.label} icon={t.icon} tone={t.tone} /> : <span style={{ color: 'var(--ink-5)' }}>—</span>
      },
    },
    {
      key: 'etapa',
      header: 'Etapa',
      render: (c) => {
        const e = ETAPA_BADGE[c.estado] ?? ETAPA_BADGE.nuevo
        return <ABMBadgeClassic label={e.label} tone={e.tone} variant="soft" />
      },
    },
    {
      key: 'agente',
      header: 'Agente',
      render: (c) => {
        const name = c.vendedor_nombre ?? 'Vos'
        const parts = name.split(' ')
        const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)
        return (
          <div className="flex items-center gap-2">
            <ABMAvatarClassic initials={initials} size="sm" />
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{initials.toUpperCase()}</span>
          </div>
        )
      },
    },
    {
      key: 'ultimoContacto',
      header: 'Último contacto',
      sortable: true,
      sortValue: (c) => c.last_contact_at ?? '',
      render: (c) => (
        <span className="font-mono-tnum text-xs" style={{ color: 'var(--ink-3)' }}>
          {relativeTime(c.last_contact_at)}
        </span>
      ),
    },
  ]

  /* --- Acciones por fila --- */
  const rowActions = (c: Cliente) => (
    <ABMRowActions
      quick={[
        {
          icon: MessageCircle,
          title: 'WhatsApp',
          onClick: () => c.telefono && window.open(`https://wa.me/${c.telefono.replace(/\D/g, '')}`, '_blank'),
        },
        {
          icon: Phone,
          title: 'Llamar',
          onClick: () => c.telefono && (window.location.href = `tel:${c.telefono}`),
        },
      ]}
      kebabItems={[
        { icon: Pencil, label: 'Editar',   onClick: () => setEditing({ ...c }) },
        { icon: Mail,   label: 'Enviar email', onClick: () => c.email && (window.location.href = `mailto:${c.email}`) },
        { icon: Trash2, label: 'Eliminar', onClick: () => setConfirming(c), tone: 'danger', divider: true },
      ]}
    />
  )

  /* --- Submit / delete (intacto) --- */
  const submit = async () => {
    if (!editing) return
    try {
      if (editing.id && editing.id > 0) {
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
    if (confirming.id < 0) {
      toast.info('No se puede eliminar un cliente demo')
      setConfirming(null)
      return
    }
    try {
      await clientesAPI.remove(confirming.id)
      toast.success('Cliente eliminado')
      setConfirming(null)
      load()
    } catch { toast.error('No se pudo eliminar') }
  }

  /* --- AI Coach context --- */
  const contextData = useMemo(() => {
    const now = Date.now()
    const dias = (iso: string | null | undefined) =>
      iso ? Math.floor((now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)) : 999
    const calientes_sin_contactar_3d = data
      .filter((c) => c.temperatura === 'caliente' && dias(c.last_contact_at) > 3)
      .slice(0, 5)
      .map((c) => ({ id: c.id, nombre: `${c.nombre} ${c.apellido}`, tel: c.telefono, dias_sin_contacto: dias(c.last_contact_at) }))
    return {
      filtro_aplicado: { busqueda: search || null, chip: activeChip },
      total_visibles: filtered.length,
      total: data.length,
      using_mock: usingMock,
      calientes_sin_contactar_3d,
      tibios_viejos: data.filter((c) => c.temperatura === 'tibio' && dias(c.last_contact_at) > 14).length,
      nuevos_sin_contactar_1h: data.filter((c) => c.estado === 'nuevo' && dias(c.last_contact_at) > 0).length,
    }
  }, [data, filtered, search, activeChip, usingMock])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6">
        <ABMPageClassic
          eyebrow="Cartera · CRM"
          title="Clientes"
          subtitleParts={[
            { strong: counts.todos,    label: 'contactos en cartera del equipo' },
            { strong: counts.calientes, label: 'calientes' },
            { strong: counts.sin7d,    label: 'sin contactar hace más de 7 días' },
          ]}
          filterChips={[
            { key: 'todos',     label: 'Todos',           count: counts.todos     },
            { key: 'calientes', label: 'Calientes',       count: counts.calientes },
            { key: 'mis',       label: 'Mis clientes',    count: counts.mis       },
            { key: 'sin-7d',    label: 'Sin contactar 7d', count: counts.sin7d    },
            { key: 'cierre',    label: 'En cierre',       count: counts.enCierre  },
          ]}
          activeChip={activeChip}
          onChipChange={setActiveChip}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar nombre, teléfono..."
          toolbar={[
            { ...TOOLBAR_IMPORT, variant: 'outline', onClick: () => toast.info('Importar — próximamente') },
            { ...TOOLBAR_EXPORT, variant: 'outline', onClick: () => toast.info('Exportar — próximamente') },
          ]}
          onAdd={() => setEditing({ ...empty })}
          addLabel="Nuevo cliente"
          view={view}
          onViewChange={setView}
          loading={loading}
          isEmpty={!loading && filtered.length === 0}
          emptyMessage="No hay clientes con esos filtros."
        >
          {loading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : view === 'table' ? (
            <ABMTableClassic
              data={filtered}
              columns={columns}
              keyExtractor={(c) => c.id}
              onRowClick={(c) => setEditing({ ...c })}
              rowActions={rowActions}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((c, i) => {
                const temp = c.temperatura ? TEMP_BADGE[c.temperatura] : null
                const etapa = ETAPA_BADGE[c.estado] ?? ETAPA_BADGE.nuevo
                return (
                  <ABMCardClassic
                    key={c.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: 'both' }}
                    avatar={{
                      initials: initialsOf(c.nombre, c.apellido),
                      tone: 'navy',
                      dot: c.temperatura === 'caliente' ? 'gold' : c.temperatura === 'tibio' ? 'warning' : 'success',
                    }}
                    title={`${c.nombre} ${c.apellido}`}
                    subtitle={`${tipoFromOrigen(c.origen)} · ${subFromOrigen(c.origen)} · ${c.pref_zona || '—'}`}
                    stats={[
                      { value: formatBudget(c.pref_presupuesto_min, c.pref_presupuesto_max, c.pref_moneda ?? 'USD'), label: 'Presupuesto' },
                      { value: etapa.label, label: 'Etapa' },
                      { value: temp?.label ?? '—', label: 'Temperatura' },
                    ]}
                    footerText={
                      <span>
                        Último contacto:{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{relativeTime(c.last_contact_at)}</strong>
                        {' · '}
                        Agente: <strong style={{ color: 'var(--text-primary)' }}>{c.vendedor_nombre ?? 'Vos'}</strong>
                      </span>
                    }
                    kebabItems={[
                      { icon: Pencil, label: 'Editar',   onClick: () => setEditing({ ...c }) },
                      { icon: MessageCircle, label: 'WhatsApp', onClick: () => c.telefono && window.open(`https://wa.me/${c.telefono.replace(/\D/g, '')}`, '_blank') },
                      { icon: Phone,  label: 'Llamar',   onClick: () => c.telefono && (window.location.href = `tel:${c.telefono}`) },
                      { icon: Trash2, label: 'Eliminar', onClick: () => setConfirming(c), tone: 'danger', divider: true },
                    ]}
                    onClick={() => setEditing({ ...c })}
                  />
                )
              })}
            </div>
          )}
        </ABMPageClassic>

        <SideModal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          title={editing?.id && editing.id > 0 ? 'Editar cliente' : 'Nuevo cliente'}
          subtitle="Datos de contacto + preferencias de búsqueda"
          stickyFooter={
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>Cancelar</button>
              <button onClick={submit} className="px-4 py-2 rounded-lg text-white active:scale-95 transition-all duration-200" style={{ backgroundColor: 'var(--navy-800)' }}>Guardar</button>
            </div>
          }
        >
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input value={editing.nombre ?? ''} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Apellido</label>
                  <input value={editing.apellido ?? ''} onChange={(e) => setEditing({ ...editing, apellido: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input value={editing.telefono ?? ''} onChange={(e) => setEditing({ ...editing, telefono: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Origen</label>
                  <select value={editing.origen ?? 'web'} onChange={(e) => setEditing({ ...editing, origen: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                    {['web', 'walk_in', 'referido', 'zonaprop', 'argenprop', 'redes', 'otro'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select value={editing.estado ?? 'nuevo'} onChange={(e) => setEditing({ ...editing, estado: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                    {['nuevo', 'contactado', 'calificado', 'cita', 'propuesta', 'cerrado', 'perdido'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
                <h4 className="text-sm font-semibold mb-2">Preferencias de búsqueda</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1">Zona</label>
                    <input value={editing.pref_zona ?? ''} onChange={(e) => setEditing({ ...editing, pref_zona: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Ambientes</label>
                    <input type="number" value={editing.pref_ambientes ?? ''} onChange={(e) => setEditing({ ...editing, pref_ambientes: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">m² min</label>
                    <input type="number" value={editing.pref_m2_min ?? ''} onChange={(e) => setEditing({ ...editing, pref_m2_min: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">m² max</label>
                    <input type="number" value={editing.pref_m2_max ?? ''} onChange={(e) => setEditing({ ...editing, pref_m2_max: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Presup. min (USD)</label>
                    <input type="number" value={editing.pref_presupuesto_min ?? ''} onChange={(e) => setEditing({ ...editing, pref_presupuesto_min: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Presup. max (USD)</label>
                    <input type="number" value={editing.pref_presupuesto_max ?? ''} onChange={(e) => setEditing({ ...editing, pref_presupuesto_max: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }} />
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
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
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
