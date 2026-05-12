import { ReactNode } from 'react'
import { Plus, Search } from 'lucide-react'

interface ABMPageProps {
  title: string
  icon?: ReactNode
  searchValue: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  filters?: ReactNode
  buttonLabel?: string
  onAdd?: () => void
  loading?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  children: ReactNode
}

export function ABMPage(props: ABMPageProps) {
  const {
    title, icon, searchValue, onSearchChange,
    searchPlaceholder = 'Buscar...', filters,
    buttonLabel = 'Nuevo', onAdd, loading, isEmpty,
    emptyMessage = 'No hay resultados', children,
  } = props

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 sticky top-0 z-20 bg-[var(--bg-app)] pb-4">
        <div className="flex items-center gap-3 mb-4">
          {icon && <div className="text-[var(--color-primary)]">{icon}</div>}
          <h1 className="text-xl md:text-2xl font-bold truncate">{title}</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          {filters}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all duration-200 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>{buttonLabel}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {!loading && isEmpty && (
          <div className="py-10 text-center text-[var(--text-secondary)]">{emptyMessage}</div>
        )}
        {/* loading: la página dueña renderiza su propio skeleton en `children`. */}
        {(loading || !isEmpty) && children}
      </div>
    </div>
  )
}
