import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface ModernSelectOption {
  value: string | number
  label: string
  hint?: string | null
  icon?: React.ReactNode
  disabled?: boolean
}

interface ModernSelectProps {
  value: string | number | null | undefined
  onChange: (value: string | number) => void
  options: ModernSelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
  width?: string  // ej: 'w-full', 'max-w-xs'
}

export function ModernSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  disabled = false,
  className = '',
  size = 'md',
  width = 'w-full',
}: ModernSelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value) ?? null
  const padding = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-3 py-2 text-sm'

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(options.length - 1, i + 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const opt = options[activeIndex]
        if (opt && !opt.disabled) { onChange(opt.value); setOpen(false) }
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, options, activeIndex, onChange])

  useEffect(() => {
    if (!open) return
    const idx = options.findIndex((o) => o.value === value)
    setActiveIndex(idx >= 0 ? idx : 0)
  }, [open, value, options])

  return (
    <div ref={wrapperRef} className={`relative ${width} ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`${padding} ${width} flex items-center justify-between gap-2 rounded-lg border transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none`}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: open ? 'var(--color-accent)' : 'var(--border-color)',
          color: 'var(--text-primary)',
          boxShadow: open ? '0 0 0 3px var(--border-glow)' : 'none',
        }}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {selected?.icon}
          <span className="truncate text-left">
            {selected
              ? selected.label
              : <span style={{ color: 'var(--text-secondary)' }}>{placeholder}</span>}
          </span>
          {selected?.hint && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold flex-shrink-0"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}
            >
              {selected.hint}
            </span>
          )}
        </span>
        <ChevronDown
          className="h-4 w-4 flex-shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--text-secondary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 left-0 right-0 rounded-lg border shadow-xl overflow-hidden animate-fade-in-up"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            maxHeight: '20rem',
            overflowY: 'auto',
          }}
        >
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              Sin opciones
            </div>
          )}
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isActive = i === activeIndex
            return (
              <button
                key={String(opt.value)}
                type="button"
                disabled={opt.disabled}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  if (opt.disabled) return
                  onChange(opt.value)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors duration-100 disabled:opacity-40"
                style={{
                  backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {opt.icon}
                <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                {opt.hint && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold flex-shrink-0"
                    style={{
                      backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--bg-hover)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {opt.hint}
                  </span>
                )}
                {isSelected && (
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
