import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  MessageSquare, Send, Search, Phone, User as UserIcon,
  CheckCheck, Clock as ClockIcon, AlertOctagon, Archive,
  PlusCircle, RefreshCw, ArrowLeft, MoreVertical, X as XIcon,
} from 'lucide-react'
import { whatsappAPI, usersAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Skeleton } from '../components/ui/Skeleton'
import type {
  WhatsappConversation, WhatsappConversationDetail, WaConvEstado, User,
} from '../types'

const ESTADO_CONFIG: Record<WaConvEstado, { label: string; color: string; icon: typeof ClockIcon }> = {
  nueva:     { label: 'Nueva',     color: 'var(--color-flame)',   icon: AlertOctagon },
  abierta:   { label: 'Abierta',   color: 'var(--color-blue)',    icon: MessageSquare },
  cerrada:   { label: 'Cerrada',   color: 'var(--color-success)', icon: Archive },
  bloqueada: { label: 'Bloqueada', color: 'var(--text-secondary)', icon: AlertOctagon },
}

type Filter = 'todas' | 'mias' | 'nuevas' | 'sin_asignar'

function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'recién'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d`
  return new Date(iso).toLocaleDateString('es-AR')
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function formatFechaSeparator(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function Inbox() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<WhatsappConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const q = searchParams.get('conv')
    return q ? parseInt(q, 10) : null
  })
  const [detail, setDetail] = useState<WhatsappConversationDetail | null>(null)
  const [filter, setFilter] = useState<Filter>('todas')
  const [search, setSearch] = useState('')
  const [vendedores, setVendedores] = useState<User[]>([])
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [mockOpen, setMockOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const r = await whatsappAPI.list()
      setConversations(r.data)
    } catch { toast.error('Error al cargar inbox') }
    finally { setLoading(false) }
  }

  const loadDetail = async (id: number) => {
    try {
      const r = await whatsappAPI.get(id)
      setDetail(r.data)
      if (r.data.unread_count > 0) {
        await whatsappAPI.markRead(id)
        setConversations((cs) => cs.map((c) => c.id === id ? { ...c, unread_count: 0 } : c))
      }
    } catch { toast.error('Error al cargar conversación') }
  }

  useEffect(() => {
    load()
    usersAPI.list().then((r) => setVendedores(r.data.filter((u: User) => u.role === 'vendedor')))
      .catch(() => {/* silent */})
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  // Auto-seleccionar la primera conversación cuando termina de cargar
  // Si hay ?conv=X en la URL, respetamos esa
  useEffect(() => {
    if (loading || conversations.length === 0) return
    const fromQuery = searchParams.get('conv')
    if (fromQuery) {
      const id = parseInt(fromQuery, 10)
      if (conversations.some((c) => c.id === id)) {
        setSelectedId(id)
        // Limpiar el query param para que no quede pegado en la URL
        searchParams.delete('conv')
        setSearchParams(searchParams, { replace: true })
        return
      }
    }
    if (selectedId === null) {
      setSelectedId(conversations[0].id)
    }
  }, [loading, conversations, selectedId, searchParams, setSearchParams])

  useEffect(() => { if (selectedId) loadDetail(selectedId) }, [selectedId])

  useEffect(() => {
    if (detail?.mensajes.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [detail?.mensajes.length])

  const filtered = useMemo(() => {
    let list = conversations
    if (filter === 'mias') list = list.filter((c) => c.assignee_id === user?.id)
    if (filter === 'nuevas') list = list.filter((c) => c.estado === 'nueva')
    if (filter === 'sin_asignar') list = list.filter((c) => !c.assignee_id)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) =>
        (c.nombre_contacto ?? '').toLowerCase().includes(q) ||
        c.telefono.includes(q) ||
        (c.ultimo_mensaje ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [conversations, filter, search, user])

  const counts = useMemo(() => ({
    todas: conversations.length,
    mias: conversations.filter((c) => c.assignee_id === user?.id).length,
    nuevas: conversations.filter((c) => c.estado === 'nueva').length,
    sin_asignar: conversations.filter((c) => !c.assignee_id).length,
  }), [conversations, user])

  const handleSend = async () => {
    if (!detail || !draft.trim() || sending) return
    setSending(true)
    try {
      await whatsappAPI.send(detail.id, draft.trim())
      setDraft('')
      await loadDetail(detail.id)
      load()
    } catch { toast.error('No se pudo enviar') }
    finally { setSending(false) }
  }

  const handleAssign = async (vendedorId: number | null) => {
    if (!detail) return
    try {
      await whatsappAPI.update(detail.id, { assignee_id: vendedorId })
      await loadDetail(detail.id)
      load()
      toast.success(vendedorId ? 'Asignado' : 'Desasignado')
    } catch { toast.error('Error al asignar') }
  }

  const handleEstado = async (estado: WaConvEstado) => {
    if (!detail) return
    try {
      await whatsappAPI.update(detail.id, { estado })
      await loadDetail(detail.id)
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  // Mobile: si hay conv seleccionada mostramos solo el chat (no la lista)
  const showListOnMobile = selectedId === null
  const [chatMenuOpen, setChatMenuOpen] = useState(false)

  return (
    <div className="flex h-full min-h-0">
      {/* Lista de conversaciones — en mobile: full width si no hay seleccion, oculta si hay */}
      <aside
        className={`flex-shrink-0 ${showListOnMobile ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 flex-col md:border-r`}
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <header className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
              <h1 className="font-bold text-lg">Inbox</h1>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                {conversations.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={load}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                title="Refrescar"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMockOpen(true)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                title="Simular mensaje entrante (demo)"
              >
                <PlusCircle className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-3 py-2 rounded-lg border bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              style={{ borderColor: 'var(--border-color)' }}
            />
          </div>
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {(['todas', 'mias', 'nuevas', 'sin_asignar'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: filter === f ? 'var(--color-accent)' : 'var(--bg-hover)',
                  color: filter === f ? 'var(--color-primary)' : 'var(--text-secondary)',
                }}
              >
                {f === 'todas' && 'Todas'}
                {f === 'mias' && 'Mías'}
                {f === 'nuevas' && 'Nuevas'}
                {f === 'sin_asignar' && 'Sin asignar'}
                <span className="font-bold">{counts[f]}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && (
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Sin conversaciones.
            </div>
          )}
          {!loading && filtered.map((c) => {
            const isSelected = c.id === selectedId
            const estadoCfg = ESTADO_CONFIG[c.estado]
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="w-full flex items-start gap-3 p-3 md:p-3 text-left transition-all duration-150 border-l-2 active:bg-[var(--bg-hover)]"
                style={{
                  backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                  borderLeftColor: isSelected ? 'var(--color-accent)' : 'transparent',
                  minHeight: 64,
                }}
              >
                <div
                  className="flex-shrink-0 w-11 h-11 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}
                >
                  {(c.nombre_contacto ?? c.cliente_nombre ?? '#').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">
                      {c.nombre_contacto ?? c.cliente_nombre ?? c.telefono}
                    </span>
                    <span className="flex-shrink-0 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {timeAgo(c.ultima_actividad)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {c.ultimo_mensaje_direccion === 'out' && (
                      <CheckCheck className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--color-blue)' }} />
                    )}
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {c.ultimo_mensaje ?? '(sin mensajes)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ backgroundColor: `${estadoCfg.color}1f`, color: estadoCfg.color }}
                    >
                      <estadoCfg.icon className="h-2.5 w-2.5" />
                      {estadoCfg.label}
                    </span>
                    {c.assignee_nombre && (
                      <span className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {c.assignee_nombre}
                      </span>
                    )}
                    {c.unread_count > 0 && (
                      <span
                        className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1"
                        style={{ backgroundColor: 'var(--color-flame)', color: '#fff' }}
                      >
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Chat activo — en mobile: oculto cuando no hay seleccion */}
      <main
        className={`flex-1 min-w-0 flex-col ${selectedId === null ? 'hidden md:flex' : 'flex'}`}
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        {!detail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8" style={{ color: 'var(--text-secondary)' }}>
            <MessageSquare className="h-12 w-12 mb-3" style={{ color: 'var(--color-accent)' }} />
            <p className="text-sm">Seleccioná una conversación de la izquierda</p>
            <p className="text-xs mt-2">o tocá <PlusCircle className="inline h-3 w-3" /> para simular un mensaje entrante</p>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <header
              className="flex-shrink-0 flex items-center justify-between gap-2 p-3 border-b"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
              }}
            >
              {/* Back button SOLO mobile */}
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden flex-shrink-0 p-2 -ml-1 rounded-lg hover:bg-black/5 active:scale-95"
                aria-label="Volver"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}
                >
                  {(detail.nombre_contacto ?? detail.cliente_nombre ?? '#').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {detail.nombre_contacto ?? detail.cliente_nombre ?? 'Sin nombre'}
                  </div>
                  <div className="flex items-center gap-2 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{detail.telefono}</span>
                    {detail.cliente_id && (
                      <span className="hidden sm:inline">
                        · Cliente #{detail.cliente_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selects desktop / kebab mobile */}
              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                <select
                  value={detail.assignee_id ?? ''}
                  onChange={(e) => handleAssign(e.target.value ? Number(e.target.value) : null)}
                  className="text-xs px-2 py-1.5 rounded border bg-transparent"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <option value="">Sin asignar</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>
                  ))}
                </select>
                <select
                  value={detail.estado}
                  onChange={(e) => handleEstado(e.target.value as WaConvEstado)}
                  className="text-xs px-2 py-1.5 rounded border bg-transparent"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <option value="nueva">Nueva</option>
                  <option value="abierta">Abierta</option>
                  <option value="cerrada">Cerrada</option>
                  <option value="bloqueada">Bloqueada</option>
                </select>
              </div>

              <button
                onClick={() => setChatMenuOpen(true)}
                className="md:hidden flex-shrink-0 p-2 -mr-1 rounded-lg hover:bg-black/5 active:scale-95"
                aria-label="Mas opciones"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </header>

            {/* Bottom sheet de opciones (mobile) */}
            {chatMenuOpen && (
              <div className="md:hidden fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/50" onClick={() => setChatMenuOpen(false)} />
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-4 animate-fade-in-up"
                  style={{ backgroundColor: 'var(--bg-card)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Opciones</h3>
                    <button onClick={() => setChatMenuOpen(false)} className="p-1 -m-1">
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                             style={{ color: 'var(--text-secondary)' }}>Asignar a</label>
                      <select
                        value={detail.assignee_id ?? ''}
                        onChange={(e) => handleAssign(e.target.value ? Number(e.target.value) : null)}
                        className="w-full text-sm px-3 py-2.5 rounded-lg border bg-transparent"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        <option value="">Sin asignar</option>
                        {vendedores.map((v) => (
                          <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                             style={{ color: 'var(--text-secondary)' }}>Estado</label>
                      <select
                        value={detail.estado}
                        onChange={(e) => handleEstado(e.target.value as WaConvEstado)}
                        className="w-full text-sm px-3 py-2.5 rounded-lg border bg-transparent"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        <option value="nueva">Nueva</option>
                        <option value="abierta">Abierta</option>
                        <option value="cerrada">Cerrada</option>
                        <option value="bloqueada">Bloqueada</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mensajes */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {detail.mensajes.map((m, idx) => {
                const isOut = m.direccion === 'out'
                const prevDate = idx > 0 ? new Date(detail.mensajes[idx - 1].enviado_at).toDateString() : ''
                const thisDate = new Date(m.enviado_at).toDateString()
                const showDateSep = prevDate !== thisDate
                return (
                  <div key={m.id}>
                    {showDateSep && (
                      <div className="text-center my-3">
                        <span
                          className="text-[10px] uppercase tracking-wider px-2 py-1 rounded"
                          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                        >
                          {formatFechaSeparator(m.enviado_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm"
                        style={{
                          backgroundColor: isOut ? 'var(--color-accent)' : 'var(--bg-card)',
                          color: isOut ? 'var(--color-primary)' : 'var(--text-primary)',
                          borderTopLeftRadius: isOut ? '1rem' : '0.25rem',
                          borderTopRightRadius: isOut ? '0.25rem' : '1rem',
                        }}
                      >
                        <div className="text-sm whitespace-pre-wrap">{m.contenido}</div>
                        <div className="flex items-center gap-1 justify-end mt-1 text-[10px] opacity-70">
                          {isOut && m.sender_nombre && (
                            <span>{m.sender_nombre.split(' ')[0]} ·</span>
                          )}
                          <span>{formatHora(m.enviado_at)}</span>
                          {isOut && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <footer
              className="flex-shrink-0 p-3 border-t"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
              }}
            >
              <div className="flex items-end gap-2">
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    // Auto-resize
                    const el = e.target as HTMLTextAreaElement
                    el.style.height = 'auto'
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); handleSend() } }}
                  placeholder={detail.estado === 'bloqueada' ? 'Conversación bloqueada' : 'Escribí una respuesta...'}
                  disabled={detail.estado === 'bloqueada' || sending}
                  className="flex-1 px-3 py-2.5 rounded-2xl border bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50 text-base md:text-sm resize-none"
                  style={{ borderColor: 'var(--border-color)', minHeight: 44 }}
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending || detail.estado === 'bloqueada'}
                  className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  aria-label="Enviar"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </footer>
          </>
        )}
      </main>

      <MockIncomingModal isOpen={mockOpen} onClose={() => setMockOpen(false)} onSent={() => { setMockOpen(false); load() }} />
    </div>
  )
}

function MockIncomingModal({ isOpen, onClose, onSent }: { isOpen: boolean; onClose: () => void; onSent: () => void }) {
  const [telefono, setTelefono] = useState('+5491155551001')
  const [nombre, setNombre] = useState('')
  const [contenido, setContenido] = useState('Hola, quería consultar por una propiedad')
  const [sending, setSending] = useState(false)

  if (!isOpen) return null

  const submit = async () => {
    setSending(true)
    try {
      await whatsappAPI.mockIncoming({
        telefono: telefono.trim(),
        nombre_contacto: nombre.trim() || undefined,
        contenido: contenido.trim(),
      })
      toast.success('Mensaje entrante simulado')
      onSent()
    } catch { toast.error('Error al simular') }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-fade-in-up"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="h-1" style={{ backgroundColor: 'var(--color-accent)' }} />
        <div className="p-5">
          <h3 className="font-bold mb-1">Simular mensaje entrante</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Demo Fase 1 (sin Meta). Crea o actualiza la conversación con el teléfono indicado.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Teléfono</label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Nombre (opcional)</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Mensaje</label>
              <textarea
                rows={3}
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: 'var(--border-color)' }}>Cancelar</button>
            <button
              onClick={submit}
              disabled={sending || !contenido.trim()}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {sending ? 'Enviando...' : 'Simular'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
