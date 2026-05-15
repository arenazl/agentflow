/* ABMPageClassic — shell editorial CB (Template Classic).
   Anatomía screenshot Clientes Claude Design:
   - Header sticky: eyebrow dorado + título serif gigante + subtitle inline con
     métricas strong + bullets · + toolbar derecha (Importar/Exportar/+Nuevo).
   - Fila de filtros: chips pill izquierda con count + search + Filtros outline
     + toggle Tabla/Cards.
   - Body scrollable.

   Toggle de vistas: 2 modos (table | cards), persistencia delegada a la página.
*/
import { ComponentType, ReactNode } from 'react'
import {
  Plus, Search, LayoutGrid, List,
  Upload, Download, SlidersHorizontal,
} from 'lucide-react'

/* ---------------- Tipos ---------------- */

export interface SubtitlePart {
  strong: string | number
  label: string
}

export interface FilterChipDef {
  key: string
  label: string
  count?: number
}

export interface ToolbarButtonDef {
  label: string
  icon?: ComponentType<{ className?: string }>
  onClick?: () => void
  variant?: 'outline' | 'navy' | 'gold'
}

/** atajos comunes para no importar lucide en cada página */
export const TOOLBAR_IMPORT: Pick<ToolbarButtonDef, 'icon' | 'label'> = { icon: Upload,   label: 'Importar' }
export const TOOLBAR_EXPORT: Pick<ToolbarButtonDef, 'icon' | 'label'> = { icon: Download, label: 'Exportar' }

export type ViewMode = 'table' | 'cards'

export interface ABMPageClassicProps {
  /** Eyebrow uppercase con barrita dorada antes del título (ej "Cartera · CRM") */
  eyebrow?: string
  /** Título principal (serif Instrument Serif) */
  title: string
  /** Métricas inline bajo el título (strong + label, separadas por ·) */
  subtitleParts?: SubtitlePart[]

  /** Chips de filtro (incluir uno "todos" para reset) */
  filterChips?: FilterChipDef[]
  activeChip?: string
  onChipChange?: (key: string) => void

  /** Búsqueda */
  searchValue: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string

  /** Botón "Filtros" outline (abre modal/popover propio de la página) */
  onOpenFilters?: () => void

  /** Toolbar derecha del header (Importar, Exportar, etc.) */
  toolbar?: ToolbarButtonDef[]
  /** Botón principal "+ Nuevo X" */
  onAdd?: () => void
  addLabel?: string

  /** Toggle de vistas Tabla/Cards */
  view?: ViewMode
  onViewChange?: (v: ViewMode) => void

  /** Slot para filtros custom (ModernSelect, DatePicker, etc.) entre los chips y el search */
  extraFilters?: ReactNode

  /** Estados */
  loading?: boolean
  isEmpty?: boolean
  emptyMessage?: string

  /** Contenido principal — típicamente <ABMTableClassic> o un grid de <ABMCardClassic> */
  children: ReactNode
}

/* ---------------- Subcomponentes ---------------- */

import { ABMFilterChip } from './ABMFilterChip'

function ToolbarBtn({ btn }: { btn: ToolbarButtonDef }) {
  const Icon = btn.icon
  const styles =
    btn.variant === 'navy'
      ? { bg: 'var(--navy-800)', color: '#fff',           border: 'var(--navy-800)' }
      : btn.variant === 'gold'
      ? { bg: 'var(--gold-500)', color: 'var(--navy-900)', border: 'var(--gold-600)' }
      : { bg: 'var(--surface)',  color: 'var(--ink-2)',    border: 'var(--border-color)' }
  return (
    <button
      type="button"
      onClick={btn.onClick}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium active:scale-95 transition-all duration-200"
      style={{
        backgroundColor: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
      }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {btn.label}
    </button>
  )
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      className="hidden md:inline-flex items-center rounded-lg p-1"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)' }}
    >
      <button
        type="button"
        onClick={() => onChange('table')}
        className="p-1.5 rounded transition-all duration-150"
        style={{
          backgroundColor: view === 'table' ? 'var(--navy-800)' : 'transparent',
          color:           view === 'table' ? '#fff'              : 'var(--ink-4)',
        }}
        title="Vista tabla"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('cards')}
        className="p-1.5 rounded transition-all duration-150"
        style={{
          backgroundColor: view === 'cards' ? 'var(--navy-800)' : 'transparent',
          color:           view === 'cards' ? '#fff'              : 'var(--ink-4)',
        }}
        title="Vista cards"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ---------------- ABMPageClassic ---------------- */

export function ABMPageClassic(props: ABMPageClassicProps) {
  const {
    eyebrow, title, subtitleParts,
    filterChips, activeChip, onChipChange,
    searchValue, onSearchChange, searchPlaceholder = 'Buscar...',
    onOpenFilters, toolbar, onAdd, addLabel = 'Nuevo',
    view, onViewChange,
    extraFilters,
    loading, isEmpty, emptyMessage = 'No hay resultados',
    children,
  } = props

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="flex-shrink-0 sticky top-0 z-20 pb-5"
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        {/* === Header: título + toolbar === */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-1">
          <div className="flex flex-col gap-2 min-w-0">
            {eyebrow && <span className="eyebrow-line">{eyebrow}</span>}
            <h1
              className="font-serif-display leading-none m-0"
              style={{
                fontSize: 'clamp(36px, 5.2vw, 56px)',
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </h1>
            {subtitleParts && subtitleParts.length > 0 && (
              <p
                className="text-sm flex items-center gap-2 flex-wrap m-0 mt-1"
                style={{ color: 'var(--ink-4)' }}
              >
                {subtitleParts.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    {i > 0 && (
                      <span
                        className="inline-block w-1 h-1 rounded-full"
                        style={{ backgroundColor: 'var(--ink-5)' }}
                      />
                    )}
                    <strong
                      style={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    >
                      {p.strong}
                    </strong>
                    <span>{p.label}</span>
                  </span>
                ))}
              </p>
            )}
          </div>

          {(toolbar || onAdd) && (
            <div className="flex items-center gap-2 flex-wrap">
              {toolbar?.map((b, i) => <ToolbarBtn key={i} btn={b} />)}
              {onAdd && (
                <button
                  type="button"
                  onClick={onAdd}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold active:scale-95 transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--navy-800)',
                    color: '#fff',
                    border: '1px solid var(--navy-800)',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {addLabel}
                </button>
              )}
            </div>
          )}
        </div>

        {/* === Fila de filtros: chips + search + filtros + view toggle === */}
        <div className="mt-5 flex items-center gap-2.5 flex-wrap">
          {filterChips && filterChips.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterChips.map((c) => (
                <ABMFilterChip
                  key={c.key}
                  label={c.label}
                  count={c.count}
                  active={activeChip === c.key}
                  onClick={() => onChipChange?.(c.key)}
                />
              ))}
            </div>
          )}

          {extraFilters && (
            <div className="flex items-center gap-2 flex-wrap">{extraFilters}</div>
          )}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: 'var(--ink-5)' }}
              />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 pl-9 pr-3 rounded-lg text-sm focus:outline-none w-56 md:w-64"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {onOpenFilters && (
              <ToolbarBtn btn={{ label: 'Filtros', icon: SlidersHorizontal, onClick: onOpenFilters, variant: 'outline' }} />
            )}

            {view !== undefined && onViewChange && (
              <ViewToggle view={view} onChange={onViewChange} />
            )}
          </div>
        </div>
      </div>

      {/* === Body === */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!loading && isEmpty && (
          <div
            className="py-16 text-center text-sm rounded-xl"
            style={{
              color: 'var(--ink-5)',
              backgroundColor: 'var(--surface)',
              border: '1px dashed var(--border-color)',
            }}
          >
            {emptyMessage}
          </div>
        )}
        {(loading || !isEmpty) && children}
      </div>
    </div>
  )
}
