/* ABMCardClassic — card del Template Classic CB para la vista "cards".
   Anatomía screenshot 2 (Coaches): avatar grande con dot → título serif →
   subtítulo → 3 stats serif → footer con stack de avatares + texto. */
import { ReactNode } from 'react'
import { ABMAvatarClassic, AvatarTone, AvatarDot } from './ABMAvatarClassic'
import { ABMKebabMenu, KebabItem } from './ABMKebabMenu'

export interface CardStat {
  value: string | number
  label: string
}

export interface CardFooterAvatar {
  initials: string
  tone?: AvatarTone
}

interface Props {
  /** avatar grande arriba a la izquierda */
  avatar: {
    initials: string
    tone?: AvatarTone
    dot?: AvatarDot
  }
  title: string
  subtitle?: string
  /** stats grandes en serif (típicamente 3) */
  stats?: CardStat[]
  /** stack de avatares + texto debajo de los stats */
  footerAvatars?: CardFooterAvatar[]
  footerText?: ReactNode
  /** menú kebab arriba a la derecha */
  kebabItems?: KebabItem[]
  /** click en toda la card */
  onClick?: () => void
  className?: string
}

export function ABMCardClassic({
  avatar, title, subtitle, stats, footerAvatars, footerText, kebabItems, onClick, className = '',
}: Props) {
  return (
    <article
      onClick={onClick}
      className={`rounded-xl p-6 flex flex-col gap-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-px' : ''} ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 0 rgba(14,43,79,0.04), 0 1px 2px rgba(14,43,79,0.04)',
      }}
      onMouseEnter={(e) => {
        if (!onClick) return
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 4px rgba(14,43,79,0.06), 0 8px 24px rgba(14,43,79,0.08)'
      }}
      onMouseLeave={(e) => {
        if (!onClick) return
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 0 rgba(14,43,79,0.04), 0 1px 2px rgba(14,43,79,0.04)'
      }}
    >
      {/* Head: avatar + título + kebab */}
      <header className="flex items-start gap-4">
        <ABMAvatarClassic
          initials={avatar.initials}
          tone={avatar.tone}
          dot={avatar.dot}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h3
            className="font-serif-display leading-tight m-0 truncate"
            style={{ fontSize: '22px', color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs m-0 mt-1" style={{ color: 'var(--ink-4)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {kebabItems && kebabItems.length > 0 && <ABMKebabMenu items={kebabItems} />}
      </header>

      {/* Stats */}
      {stats && stats.length > 0 && (
        <div
          className="grid gap-4 pt-4"
          style={{
            gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
            borderTop: '1px solid var(--divider)',
          }}
        >
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <div
                className="font-serif-display tnum leading-none"
                style={{ fontSize: '28px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
              >
                {s.value}
              </div>
              <div className="uppercase-label mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Footer: stack avatares + texto */}
      {(footerAvatars || footerText) && (
        <footer
          className="flex items-center gap-3 pt-4"
          style={{ borderTop: '1px solid var(--divider)' }}
        >
          {footerAvatars && footerAvatars.length > 0 && (
            <div className="flex items-center">
              {footerAvatars.map((a, i) => (
                <div key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  <ABMAvatarClassic
                    initials={a.initials}
                    tone={a.tone ?? 'soft'}
                    size="sm"
                    style={{ boxShadow: '0 0 0 2px var(--surface)' }}
                  />
                </div>
              ))}
            </div>
          )}
          {footerText && (
            <div className="text-xs flex-1 min-w-0 truncate" style={{ color: 'var(--ink-3)' }}>
              {footerText}
            </div>
          )}
        </footer>
      )}
    </article>
  )
}
