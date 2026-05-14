import { useState, useEffect } from 'react'
import { Circle } from 'lucide-react'
import { toast } from 'sonner'
import { usersAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export function AvailabilityToggle() {
  const { user } = useAuth()
  const [available, setAvailable] = useState(!!user?.is_available)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setAvailable(!!user?.is_available)
  }, [user?.is_available])

  if (!user || user.role !== 'vendedor') return null

  const toggle = async () => {
    const next = !available
    setAvailable(next)
    setSaving(true)
    try {
      await usersAPI.setAvailability(next)
      toast.success(next ? 'Disponible para recibir leads' : 'Marcado como ocupado')
    } catch {
      setAvailable(!next)
      toast.error('No se pudo actualizar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95"
      style={{
        backgroundColor: available ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-hover)',
        color: available ? 'var(--color-success)' : 'var(--text-secondary)',
        border: `1px solid ${available ? 'var(--color-success)' : 'var(--border-color)'}`,
      }}
      title={available ? 'Click para marcarte ocupado' : 'Click para marcarte disponible'}
    >
      <Circle
        className="h-2.5 w-2.5"
        fill={available ? 'var(--color-success)' : 'var(--text-secondary)'}
        strokeWidth={0}
      />
      {available ? 'Disponible' : 'Ocupado'}
    </button>
  )
}
