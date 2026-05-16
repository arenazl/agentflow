import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Brain, Building2, MessageSquare, Wand2, HelpCircle, Save,
  Plus, Pencil, Trash2, RefreshCw, Wifi, WifiOff, Circle,
  Sparkles, Send,
} from 'lucide-react'
import { whatsappAPI } from '../services/api'
import { botConfigAPI } from '../services/api'
import { SideModal } from '../components/SideModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { useAuth } from '../contexts/AuthContext'
import type { BotConfig, BaileysStatus, BotFaq } from '../types'

type TabKey = 'empresa' | 'whatsapp' | 'tono' | 'faq' | 'joda'

export function DatosIA() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'gerente'
  const [tab, setTab] = useState<TabKey>('empresa')
  const [cfg, setCfg] = useState<BotConfig | null>(null)
  const [draft, setDraft] = useState<BotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const r = await botConfigAPI.get()
      setCfg(r.data); setDraft(r.data)
    } catch { toast.error('Error al cargar config del bot') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const dirty = JSON.stringify(cfg) !== JSON.stringify(draft)

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const r = await botConfigAPI.update(draft)
      setCfg(r.data); setDraft(r.data)
      toast.success('Guardado. El bot ya usa estos datos.')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>
  }
  if (!draft) return null

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'empresa', label: 'Datos empresa', icon: Building2 },
    { key: 'whatsapp', label: 'Conexion WhatsApp', icon: MessageSquare },
    { key: 'tono', label: 'Tono y reglas', icon: Wand2 },
    { key: 'faq', label: 'FAQ', icon: HelpCircle },
    { key: 'joda', label: 'Joda de hoy', icon: Sparkles },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <header className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6" style={{ color: 'var(--color-accent)' }} />
            <div>
              <h1 className="text-2xl font-bold">Datos IA</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Configuracion del bot WhatsApp y base de conocimiento
              </p>
            </div>
          </div>
          {canEdit && dirty && tab !== 'faq' && tab !== 'joda' && (
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 mt-4 border-b overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide" style={{ borderColor: 'var(--border-color)' }}>
          {tabs.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap flex-shrink-0"
                style={{
                  borderBottomColor: active ? 'var(--color-accent)' : 'transparent',
                  color: active ? 'var(--color-accent)' : 'var(--text-secondary)',
                }}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        {tab === 'empresa' && <TabEmpresa draft={draft} setDraft={setDraft} canEdit={canEdit} />}
        {tab === 'whatsapp' && <TabWhatsapp draft={draft} setDraft={setDraft} canEdit={canEdit} />}
        {tab === 'tono' && <TabTono draft={draft} setDraft={setDraft} canEdit={canEdit} />}
        {tab === 'faq' && <TabFaq canEdit={canEdit} />}
        {tab === 'joda' && <TabJoda draft={draft} setDraft={setDraft} canEdit={canEdit} onSaved={load} />}
      </div>
    </div>
  )
}

// ---------- TAB 1 ----------

function TabEmpresa({ draft, setDraft, canEdit }: { draft: BotConfig; setDraft: (b: BotConfig) => void; canEdit: boolean }) {
  const set = (k: keyof BotConfig, v: string) => setDraft({ ...draft, [k]: v })
  return (
    <div className="space-y-6 max-w-4xl">
      <Section title="Contacto">
        <Grid>
          <Field label="Teléfono oficial WhatsApp">
            <Input value={draft.telefono_oficial} onChange={(v) => set('telefono_oficial', v)} disabled={!canEdit}
                   placeholder="+54 9 11 1234-5678" />
          </Field>
          <Field label="Email oficial">
            <Input value={draft.email_oficial} onChange={(v) => set('email_oficial', v)} disabled={!canEdit}
                   placeholder="contacto@beyker.com.ar" />
          </Field>
          <Field label="Dirección" full>
            <Input value={draft.direccion} onChange={(v) => set('direccion', v)} disabled={!canEdit}
                   placeholder="Florida 826, CABA" />
          </Field>
          <Field label="Web">
            <Input value={draft.web} onChange={(v) => set('web', v)} disabled={!canEdit}
                   placeholder="beykercoldwell.com.ar" />
          </Field>
          <Field label="Instagram">
            <Input value={draft.instagram} onChange={(v) => set('instagram', v)} disabled={!canEdit}
                   placeholder="@cbbeyker" />
          </Field>
        </Grid>
      </Section>

      <Section title="Horarios de atención">
        <Grid>
          <Field label="Lunes a viernes" full>
            <Input value={draft.horario_semana} onChange={(v) => set('horario_semana', v)} disabled={!canEdit}
                   placeholder="Lunes a viernes de 9 a 18hs" />
          </Field>
          <Field label="Sábado">
            <Input value={draft.horario_sabado} onChange={(v) => set('horario_sabado', v)} disabled={!canEdit}
                   placeholder="Sábados de 10 a 14hs" />
          </Field>
          <Field label="Domingo / feriados">
            <Input value={draft.horario_domingo} onChange={(v) => set('horario_domingo', v)} disabled={!canEdit}
                   placeholder="Domingos y feriados cerrado" />
          </Field>
        </Grid>
      </Section>

      <Section title="Comisiones y honorarios">
        <Grid>
          <Field label="Comisión al vendedor (compraventa)">
            <Input value={draft.comision_compra_vendedor} onChange={(v) => set('comision_compra_vendedor', v)} disabled={!canEdit}
                   placeholder="3% del valor + IVA" />
          </Field>
          <Field label="Comisión al comprador (compraventa)">
            <Input value={draft.comision_compra_comprador} onChange={(v) => set('comision_compra_comprador', v)} disabled={!canEdit}
                   placeholder="3% del valor + IVA" />
          </Field>
          <Field label="Comisión al propietario (alquiler)">
            <Input value={draft.comision_alquiler_propietario} onChange={(v) => set('comision_alquiler_propietario', v)} disabled={!canEdit}
                   placeholder="1 mes + IVA" />
          </Field>
          <Field label="Comisión al inquilino (alquiler)">
            <Input value={draft.comision_alquiler_inquilino} onChange={(v) => set('comision_alquiler_inquilino', v)} disabled={!canEdit}
                   placeholder="1 mes + IVA" />
          </Field>
          <Field label="Reserva estándar">
            <Input value={draft.reserva_pct_estandar} onChange={(v) => set('reserva_pct_estandar', v)} disabled={!canEdit}
                   placeholder="5%" />
          </Field>
          <Field label="Plazo de aceptación de reserva">
            <Input value={draft.reserva_plazo_aceptacion} onChange={(v) => set('reserva_plazo_aceptacion', v)} disabled={!canEdit}
                   placeholder="48-72hs" />
          </Field>
        </Grid>
      </Section>

      <Section title="Identidad y diferencial (texto libre)">
        <Field label="Notas extra de identidad" full>
          <Textarea value={draft.identidad_extra} onChange={(v) => setDraft({ ...draft, identidad_extra: v })} disabled={!canEdit}
                    rows={3} placeholder="Detalles que querés que el bot mencione sobre quiénes son..." />
        </Field>
        <Field label="Diferencial extra" full>
          <Textarea value={draft.diferencial_extra} onChange={(v) => setDraft({ ...draft, diferencial_extra: v })} disabled={!canEdit}
                    rows={3} placeholder="Qué los hace distintos en el mercado..." />
        </Field>
      </Section>
    </div>
  )
}

// ---------- TAB 2 ----------

function TabWhatsapp({ draft, setDraft, canEdit }: { draft: BotConfig; setDraft: (b: BotConfig) => void; canEdit: boolean }) {
  const [status, setStatus] = useState<BaileysStatus | null>(null)
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    try { const r = await botConfigAPI.baileysStatus(); setStatus(r.data) }
    catch { toast.error('Error al verificar') }
    finally { setChecking(false) }
  }
  useEffect(() => { check() }, [])

  const set = (k: keyof BotConfig, v: string) => setDraft({ ...draft, [k]: v })

  return (
    <div className="space-y-6 max-w-4xl">
      <Section title="Estado de la conexión">
        <div
          className="flex items-center justify-between p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: status?.baileys_ready ? 'var(--color-success)' : 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-3">
            {status?.baileys_ready
              ? <Wifi className="h-5 w-5" style={{ color: 'var(--color-success)' }} />
              : <WifiOff className="h-5 w-5" style={{ color: 'var(--color-flame)' }} />}
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Circle className="h-2.5 w-2.5"
                  fill={status?.baileys_ready ? 'var(--color-success)' : 'var(--color-flame)'}
                  strokeWidth={0} />
                {status?.baileys_ready ? 'Conectado a WhatsApp' : 'Desconectado'}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {status?.configurado === false && 'Falta URL del servicio Baileys'}
                {status?.numero && `Número: ${status.numero}`}
                {status?.error && `Error: ${status.error}`}
                {!status?.numero && !status?.error && status?.configurado && 'Esperando QR scan o reconectando...'}
              </div>
            </div>
          </div>
          <button
            onClick={check}
            disabled={checking}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            Verificar
          </button>
        </div>
      </Section>

      {status?.has_pending_qr && draft.baileys_service_url && (
        <Section title="Escanear código QR (pareo inicial)">
          <p className="text-sm mb-3">
            El servicio está esperando que escanees el QR con WhatsApp Business del celular oficial de Beyker.
          </p>
          <div className="flex flex-col items-center gap-3 p-4 rounded-lg border"
               style={{ backgroundColor: '#fff', borderColor: 'var(--border-color)' }}>
            <a
              href={`${draft.baileys_service_url}/qr`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white"
              style={{ backgroundColor: '#25D366' }}
            >
              Abrir página de QR (nueva pestaña)
            </a>
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              Abrí WhatsApp Business app → Menú → Dispositivos vinculados → Vincular un dispositivo<br />
              y escaneá el código.
            </p>
          </div>
        </Section>
      )}

      <Section title="Configuración del servicio Baileys">
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          El servicio Baileys (Node.js) corre en un server separado y conecta con WhatsApp Web del celular dedicado de Beyker.
        </p>
        <Grid>
          <Field label="URL del servicio Baileys" full>
            <Input value={draft.baileys_service_url} onChange={(v) => set('baileys_service_url', v)} disabled={!canEdit}
                   placeholder="https://agentflow-baileys-xxx.herokuapp.com" />
          </Field>
          <Field label="API key compartida" full>
            <Input value={draft.baileys_api_key} onChange={(v) => set('baileys_api_key', v)} disabled={!canEdit}
                   placeholder="secret-largo-random" />
          </Field>
          <Field label="Número oficial de WhatsApp">
            <Input value={draft.numero_oficial_wa} onChange={(v) => set('numero_oficial_wa', v)} disabled={!canEdit}
                   placeholder="+54 9 11 1234-5678" />
          </Field>
        </Grid>
      </Section>
    </div>
  )
}

// ---------- TAB 3 ----------

function TabTono({ draft, setDraft, canEdit }: { draft: BotConfig; setDraft: (b: BotConfig) => void; canEdit: boolean }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <Section title="Mensajes del bot">
        <Field label="Mensaje de bienvenida" full>
          <Textarea value={draft.mensaje_bienvenida} onChange={(v) => setDraft({ ...draft, mensaje_bienvenida: v })}
                    disabled={!canEdit} rows={3}
                    placeholder="¡Hola! Soy el asistente de Beyker. ¿En qué te puedo ayudar?" />
        </Field>
        <Field label="Mensaje fuera de horario" full>
          <Textarea value={draft.mensaje_off_hours} onChange={(v) => setDraft({ ...draft, mensaje_off_hours: v })}
                    disabled={!canEdit} rows={3}
                    placeholder="Estamos fuera de horario. Mañana te escribe un asesor..." />
        </Field>
      </Section>

      <Section title="Tono extra">
        <Field label="Instrucciones adicionales sobre el tono" full>
          <Textarea value={draft.tono_extra} onChange={(v) => setDraft({ ...draft, tono_extra: v })} disabled={!canEdit}
                    rows={5}
                    placeholder="Ejemplo: usá más humor, no menciones competencia, evitá tecnicismos..." />
        </Field>
      </Section>

      <Section title="Reglas de derivación">
        <Field label="Palabras o frases que disparan derivación inmediata (una por línea)" full>
          <Textarea value={draft.palabras_derivacion_extra} onChange={(v) => setDraft({ ...draft, palabras_derivacion_extra: v })}
                    disabled={!canEdit} rows={5}
                    placeholder="quiero hablar con alguien&#10;tengo una queja&#10;urgente&#10;abogado" />
        </Field>
      </Section>
    </div>
  )
}

// ---------- TAB 4: FAQ ABM ----------

function TabFaq({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<BotFaq[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<BotFaq> | null>(null)
  const [confirmDel, setConfirmDel] = useState<BotFaq | null>(null)

  const load = async () => {
    try { const r = await botConfigAPI.faqs.list(); setItems(r.data) }
    catch { toast.error('Error al cargar FAQ') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing({ pregunta: '', respuesta: '', orden: items.length + 1, activo: true }); setModalOpen(true) }
  const openEdit = (f: BotFaq) => { setEditing({ ...f }); setModalOpen(true) }

  const save = async () => {
    if (!editing?.pregunta?.trim() || !editing.respuesta?.trim()) { toast.error('Completá pregunta y respuesta'); return }
    try {
      const payload = {
        pregunta: editing.pregunta, respuesta: editing.respuesta,
        orden: editing.orden ?? 0, activo: editing.activo ?? true,
      }
      if (editing.id) await botConfigAPI.faqs.update(editing.id, payload)
      else await botConfigAPI.faqs.create(payload)
      toast.success('FAQ guardada')
      setModalOpen(false); load()
    } catch { toast.error('Error al guardar') }
  }

  const remove = async () => {
    if (!confirmDel) return
    try {
      await botConfigAPI.faqs.remove(confirmDel.id)
      toast.success('FAQ eliminada'); setConfirmDel(null); load()
    } catch { toast.error('Error al eliminar') }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Pares pregunta/respuesta que el bot prioriza sobre el conocimiento general.
        </p>
        {canEdit && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-white transition-all duration-200 active:scale-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" /> Nueva FAQ
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 rounded-xl border-2 border-dashed text-sm"
             style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          Aún no hay FAQ cargadas. Tocá "Nueva FAQ" para empezar.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((f) => (
            <div key={f.id} className="rounded-lg border p-4"
                 style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', opacity: f.activo ? 1 : 0.5 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm mb-1">{f.pregunta}</div>
                  <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{f.respuesta}</div>
                  {!f.activo && <div className="text-[10px] uppercase tracking-wider mt-2 font-semibold"
                                     style={{ color: 'var(--color-flame)' }}>Inactiva</div>}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(f)} className="p-1.5 rounded hover:bg-black/5">
                      <Pencil className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button onClick={() => setConfirmDel(f)} className="p-1.5 rounded hover:bg-black/5">
                      <Trash2 className="h-4 w-4" style={{ color: 'var(--color-danger)' }} />
                    </button>
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
        title={editing?.id ? 'Editar FAQ' : 'Nueva FAQ'}
        subtitle="Pregunta y respuesta que el bot va a usar"
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
            <Field label="Pregunta" full>
              <Input value={editing.pregunta} onChange={(v) => setEditing({ ...editing, pregunta: v })} />
            </Field>
            <Field label="Respuesta" full>
              <Textarea value={editing.respuesta} onChange={(v) => setEditing({ ...editing, respuesta: v })} rows={4} />
            </Field>
            <Grid>
              <Field label="Orden">
                <Input type="number" value={String(editing.orden ?? 0)} onChange={(v) => setEditing({ ...editing, orden: parseInt(v) || 0 })} />
              </Field>
              <label className="flex items-end gap-2 text-sm pb-2">
                <input type="checkbox" checked={!!editing.activo}
                       onChange={(e) => setEditing({ ...editing, activo: e.target.checked })} />
                Activa
              </label>
            </Grid>
          </div>
        )}
      </SideModal>

      <ConfirmModal
        isOpen={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
        title="Eliminar FAQ"
        message={`¿Eliminar "${confirmDel?.pregunta}"?`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  )
}

// ---------- TAB 5: Joda de hoy ----------

interface TabJodaProps {
  draft: BotConfig
  setDraft: (b: BotConfig) => void
  canEdit: boolean
  onSaved: () => void
}

function TabJoda({ draft, setDraft, canEdit, onSaved }: TabJodaProps) {
  const set = (k: keyof BotConfig, v: string) => setDraft({ ...draft, [k]: v })
  const [saving, setSaving] = useState(false)
  const [firing, setFiring] = useState(false)

  const guardar = async () => {
    setSaving(true)
    try {
      await botConfigAPI.update({
        joda_telefono: draft.joda_telefono,
        joda_prompt: draft.joda_prompt,
        joda_saludo: draft.joda_saludo,
      } as Partial<BotConfig>)
      toast.success('Configuracion de joda guardada')
      onSaved()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const disparar = async () => {
    const tel = (draft.joda_telefono || '').trim()
    const prompt = (draft.joda_prompt || '').trim()
    const saludo = (draft.joda_saludo || '').trim()
    if (!tel || !prompt || !saludo) {
      toast.error('Completa telefono, prompt y saludo antes de disparar')
      return
    }
    setFiring(true)
    try {
      await whatsappAPI.iniciarConversacion({
        telefono: tel,
        prompt,
        primer_mensaje: saludo,
      })
      toast.success('Conversacion disparada. Cuando responda, el bot sigue solo.')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error al disparar')
    } finally {
      setFiring(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div
        className="p-4 rounded-lg border text-sm"
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          color: 'var(--text-primary)',
        }}
      >
        <p className="font-medium mb-1">Modo proactivo — perfil custom</p>
        <p style={{ color: 'var(--text-secondary)' }}>
          Carga un telefono, un prompt de identidad y un saludo inicial. Al tocar <strong>Disparar</strong>,
          el bot manda el saludo a ese numero usando esa identidad (en vez del prompt de Beyker).
          Cuando el destinatario responda, sigue la charla solo con ese prompt.
        </p>
      </div>

      <Field label="Telefono destino (E.164, sin +)" full>
        <Input
          value={draft.joda_telefono}
          onChange={(v) => set('joda_telefono', v)}
          disabled={!canEdit}
          placeholder="5491143999948"
        />
      </Field>

      <Field label="Prompt personalizado (identidad / personalidad del bot)" full>
        <Textarea
          value={draft.joda_prompt}
          onChange={(v) => set('joda_prompt', v)}
          disabled={!canEdit}
          rows={14}
          placeholder="Sos Laura, 28 anios, de Moreno. Le estas escribiendo a..."
        />
      </Field>

      <Field label="Saludo inicial (primer mensaje que se envia)" full>
        <Textarea
          value={draft.joda_saludo}
          onChange={(v) => set('joda_saludo', v)}
          disabled={!canEdit}
          rows={3}
          placeholder="Hola Ro, que onda? podes hablar?"
        />
      </Field>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={guardar}
          disabled={!canEdit || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all active:scale-95 disabled:opacity-50"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>

        <button
          type="button"
          onClick={disparar}
          disabled={!canEdit || firing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Send className="h-4 w-4" />
          {firing ? 'Disparando...' : 'Disparar conversacion'}
        </button>
      </div>
    </div>
  )
}

// ---------- Helpers ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </h2>
      <div className="rounded-xl border p-4 space-y-4"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        {children}
      </div>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1"
             style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, disabled, placeholder, type }: {
  value?: string | null; onChange?: (v: string) => void; disabled?: boolean; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type || 'text'}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm disabled:opacity-60"
      style={{ borderColor: 'var(--border-color)' }}
    />
  )
}

function Textarea({ value, onChange, disabled, rows, placeholder }: {
  value?: string | null; onChange?: (v: string) => void; disabled?: boolean; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      rows={rows || 3}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm disabled:opacity-60 resize-y"
      style={{ borderColor: 'var(--border-color)' }}
    />
  )
}
