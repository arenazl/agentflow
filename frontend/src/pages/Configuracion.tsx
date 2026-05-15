import { useState } from 'react'
import {
  Settings as SettingsIcon, User, Palette, Target, Bell, Shield,
  Sun, Moon, Save, RotateCcw, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../services/api'

type TabKey = 'cuenta' | 'tema' | 'metas' | 'notificaciones' | 'seguridad'

interface TabDef {
  key: TabKey
  label: string
  icon: typeof User
  description: string
}

const TABS: TabDef[] = [
  { key: 'cuenta',         label: 'Cuenta',         icon: User,    description: 'Tus datos personales' },
  { key: 'tema',           label: 'Tema',           icon: Palette, description: 'Visualización claro / oscuro' },
  { key: 'metas',          label: 'Metas DMO',      icon: Target,  description: 'Meta diaria de conversaciones' },
  { key: 'notificaciones', label: 'Notificaciones', icon: Bell,    description: 'Mails y push' },
  { key: 'seguridad',      label: 'Seguridad',      icon: Shield,  description: 'Password y sesiones' },
]

export function Configuracion() {
  const { user, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [tab, setTab] = useState<TabKey>('cuenta')
  const [meta, setMeta] = useState(user?.meta_conversaciones_diaria ?? 20)
  const [notifMail, setNotifMail] = useState(true)
  const [notifPush, setNotifPush] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await api.patch(`/users/${user.id}`, { meta_conversaciones_diaria: meta })
      await refreshUser()
      toast.success('Cambios guardados')
      setHasChanges(false)
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const handleReset = () => {
    setMeta(user?.meta_conversaciones_diaria ?? 20)
    setHasChanges(false)
  }

  const currentTab = TABS.find((t) => t.key === tab)!

  return (
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between flex-shrink-0 gap-4 flex-wrap">
        <div className="flex flex-col gap-2 min-w-0">
          <span className="eyebrow-line">Sistema · Ajustes</span>
          <h1
            className="font-serif-display leading-none m-0"
            style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', color: 'var(--text-primary)' }}
          >
            Configuración
          </h1>
          <p className="text-sm m-0" style={{ color: 'var(--ink-4)' }}>
            {currentTab.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!hasChanges || saving}
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all duration-200 active:scale-95 disabled:opacity-40"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </button>
          <button
            disabled={!hasChanges || saving}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
              color: '#fff',
            }}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Sidebar interno con tabs verticales */}
        <aside
          className="flex-shrink-0 w-56 rounded-xl border p-2"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <nav className="space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: active ? 'var(--color-accent)' : 'transparent',
                    color: active ? 'var(--color-primary)' : 'var(--text-primary)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Contenido del tab */}
        <section
          className="flex-1 min-w-0 rounded-xl border p-6 overflow-y-auto"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          {tab === 'cuenta' && user && (
            <div className="max-w-xl space-y-5 animate-fade-in-up">
              <div className="flex items-center gap-4">
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}
                >
                  {user.nombre[0]}{user.apellido[0]}
                </div>
                <div>
                  <div className="text-xl font-bold">{user.nombre} {user.apellido}</div>
                  <div className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {user.role}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email" value={user.email} />
                <Field label="Teléfono" value={user.telefono ?? '—'} />
                <Field label="Rol" value={user.role} />
                <Field label="Cuenta activa" value={user.is_active ? 'Sí' : 'No'} />
              </div>
            </div>
          )}

          {tab === 'tema' && (
            <div className="max-w-xl space-y-4 animate-fade-in-up">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Elegí el modo de visualización. La preferencia se guarda en este navegador.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <ThemeOption
                  active={theme === 'light'}
                  onClick={() => setTheme('light')}
                  icon={Sun}
                  label="Claro"
                  preview="bg-white border-slate-200"
                  textColor="#0f172a"
                />
                <ThemeOption
                  active={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                  icon={Moon}
                  label="Oscuro"
                  preview="bg-[#0f1d3a] border-[#1e3358]"
                  textColor="#f1f5f9"
                />
              </div>
            </div>
          )}

          {tab === 'metas' && (
            <div className="max-w-xl space-y-5 animate-fade-in-up">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Meta de conversaciones diarias en el Money Block.
                Estándar de industria (Tom Ferry, Landvoice): 20 conversaciones reales por día.
              </p>
              <div
                className="rounded-lg p-4 flex items-center gap-6"
                style={{ backgroundColor: 'var(--bg-app)' }}
              >
                <button
                  onClick={() => { setMeta((m) => Math.max(0, m - 1)); setHasChanges(true) }}
                  className="w-10 h-10 rounded-lg border flex items-center justify-center text-xl active:scale-95 transition-all duration-200"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="text-5xl font-bold" style={{ color: 'var(--color-accent)' }}>{meta}</div>
                  <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--text-secondary)' }}>
                    conversaciones / día
                  </div>
                </div>
                <button
                  onClick={() => { setMeta((m) => m + 1); setHasChanges(true) }}
                  className="w-10 h-10 rounded-lg border flex items-center justify-center text-xl active:scale-95 transition-all duration-200"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  +
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[10, 15, 20, 25, 30].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { setMeta(preset); setHasChanges(true) }}
                    className="py-2 rounded-lg border text-sm transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: meta === preset ? 'var(--color-accent)' : 'transparent',
                      color: meta === preset ? 'var(--color-primary)' : 'var(--text-primary)',
                      borderColor: meta === preset ? 'var(--color-accent)' : 'var(--border-color)',
                      fontWeight: meta === preset ? 600 : 400,
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'notificaciones' && (
            <div className="max-w-xl space-y-3 animate-fade-in-up">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Cómo recibís alertas del sistema.
              </p>
              <Toggle
                label="Recordatorios por mail"
                description="Resumen diario, alertas DMO, visitas próximas"
                value={notifMail}
                onChange={(v) => { setNotifMail(v); setHasChanges(true) }}
              />
              <Toggle
                label="Push del navegador"
                description="Alertas de leads calientes en tiempo real"
                value={notifPush}
                onChange={(v) => { setNotifPush(v); setHasChanges(true) }}
              />
            </div>
          )}

          {tab === 'seguridad' && (
            <div className="max-w-xl space-y-4 animate-fade-in-up">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sesión y password.
              </p>
              <button
                className="w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 hover:bg-[var(--bg-hover)] active:scale-95"
                style={{ borderColor: 'var(--border-color)' }}
                onClick={() => toast.info('Cambio de password: pendiente (demo)')}
              >
                <div className="font-semibold text-sm">Cambiar password</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Última modificación: hace 30 días
                </div>
              </button>
              <button
                className="w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 hover:bg-[var(--bg-hover)] active:scale-95"
                style={{ borderColor: 'var(--border-color)' }}
                onClick={() => toast.info('Cierre de sesiones: pendiente (demo)')}
              >
                <div className="font-semibold text-sm">Cerrar sesiones de otros dispositivos</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Mantiene esta sesión activa, invalida las demás
                </div>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="font-semibold capitalize">{value}</div>
    </div>
  )
}

function ThemeOption({ active, onClick, icon: Icon, label, preview, textColor }: {
  active: boolean
  onClick: () => void
  icon: typeof Sun
  label: string
  preview: string
  textColor: string
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 p-4 text-left transition-all duration-200 active:scale-95 relative ${preview}`}
      style={{
        borderColor: active ? 'var(--color-accent)' : 'var(--border-color)',
        boxShadow: active ? '0 0 0 4px var(--border-glow)' : 'none',
        color: textColor,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className="h-5 w-5" />
        {active && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Check className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
          </div>
        )}
      </div>
      <div className="font-semibold">{label}</div>
      <div className="text-xs mt-1 opacity-70">
        {label === 'Claro' ? 'Fondo blanco' : 'Fondo navy'}
      </div>
    </button>
  )
}

function Toggle({ label, description, value, onChange }: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div className="min-w-0 mr-3">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200"
        style={{ backgroundColor: value ? 'var(--color-accent)' : 'var(--bg-hover)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200"
          style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}
