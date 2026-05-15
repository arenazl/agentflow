import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { UserCircle, Save, Phone, Mail, Smartphone, BellRing, Bell } from 'lucide-react'
import { usersAPI, pushAPI } from '../services/api'
import type { User } from '../types'

export function MiPerfil() {
  const [me, setMe] = useState<User | null>(null)
  const [draft, setDraft] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const r = await usersAPI.me()
      setMe(r.data); setDraft(r.data)
    } catch { toast.error('Error al cargar tu perfil') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const dirty = JSON.stringify(me) !== JSON.stringify(draft)

  const set = <K extends keyof User>(k: K, v: User[K]) => {
    if (!draft) return
    setDraft({ ...draft, [k]: v })
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const payload: any = {
        nombre: draft.nombre,
        apellido: draft.apellido,
        telefono: draft.telefono,
        telefono_personal: draft.telefono_personal,
      }
      const r = await usersAPI.updateMe(payload)
      setMe(r.data); setDraft(r.data)
      toast.success('Perfil actualizado')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  if (loading || !draft) {
    return <div className="p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>
  }

  const isVendedor = draft.role === 'vendedor'

  return (
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 overflow-y-auto">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex flex-col gap-2 min-w-0">
          <span className="eyebrow-line">Cuenta · Personal</span>
          <h1
            className="font-serif-display leading-none m-0"
            style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', color: 'var(--text-primary)' }}
          >
            Mi perfil
          </h1>
          <p className="text-sm m-0" style={{ color: 'var(--ink-4)' }}>
            Editá tu información personal y configuración
          </p>
        </div>
        {dirty && (
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

      <div className="space-y-5 max-w-2xl">
        {/* Tarjeta identidad */}
        <Section title="Datos personales">
          <Grid>
            <Field label="Nombre">
              <Input value={draft.nombre} onChange={(v) => set('nombre', v)} />
            </Field>
            <Field label="Apellido">
              <Input value={draft.apellido} onChange={(v) => set('apellido', v)} />
            </Field>
            <Field label="Email" full>
              <Input value={draft.email} disabled icon={<Mail className="h-4 w-4" />} />
              <Hint>El email no se puede cambiar. Pedile al admin si necesitás otro.</Hint>
            </Field>
            <Field label="Rol" full>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                   style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                {draft.role}
              </div>
            </Field>
          </Grid>
        </Section>

        <Section title="Contacto">
          <Grid>
            <Field label="Teléfono de oficina">
              <Input value={draft.telefono} onChange={(v) => set('telefono', v)}
                     icon={<Phone className="h-4 w-4" />} placeholder="+54 9 11 1234-5678" />
              <Hint>Tu interno de Beyker (opcional).</Hint>
            </Field>
            {isVendedor && (
              <Field label="WhatsApp personal" full>
                <Input value={draft.telefono_personal} onChange={(v) => set('telefono_personal', v)}
                       icon={<Smartphone className="h-4 w-4" />} placeholder="+54 9 11 1234-5678" />
                <Hint>
                  <BellRing className="h-3.5 w-3.5 inline mr-1" />
                  Acá te avisamos cuando te asignan un lead nuevo. <strong>El cliente NO ve este número</strong> — solo lo usamos para notificarte.
                </Hint>
              </Field>
            )}
          </Grid>
        </Section>

        {isVendedor && (
          <Section title="Estado de trabajo">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Tu disponibilidad se cambia desde el toggle del header arriba (Disponible / Ocupado).
              Cuando estás Ocupado el round-robin no te asigna leads nuevos.
            </p>
          </Section>
        )}

        <Section title="Probar notificaciones push">
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Si ya activaste las notificaciones, este botón te envía un push de prueba al/los dispositivo/s donde aceptaste.
          </p>
          <button
            onClick={async () => {
              try {
                await pushAPI.test()
                toast.success('Push enviado. Esperá unos segundos...')
              } catch (e: any) {
                toast.error(e?.response?.data?.detail || 'Error al enviar push')
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 active:scale-95"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Bell className="h-4 w-4" />
            Enviar push de prueba
          </button>
        </Section>
      </div>
    </div>
  )
}

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

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{children}</p>
  )
}

function Input({ value, onChange, disabled, placeholder, icon }: {
  value?: string | null; onChange?: (v: string) => void; disabled?: boolean; placeholder?: string; icon?: React.ReactNode
}) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
             style={{ color: 'var(--text-secondary)' }}>
          {icon}
        </div>
      )}
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 rounded-lg border bg-transparent text-sm disabled:opacity-60`}
        style={{ borderColor: 'var(--border-color)' }}
      />
    </div>
  )
}
