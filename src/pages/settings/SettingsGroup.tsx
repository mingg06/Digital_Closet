import { useId, type ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title: string
  footer?: ReactNode
  children: ReactNode
}) {
  const id = useId()
  return (
    <section className="settings-group" aria-labelledby={id}>
      <h2 id={id} className="settings-group-title">
        {title}
      </h2>
      <div className="settings-list">{children}</div>
      {footer && <div className="settings-group-footer">{footer}</div>}
    </section>
  )
}

type RowProps = {
  icon?: LucideIcon
  label: ReactNode
  detail?: ReactNode
  /** Content shown at the end of the row, such as a button or badge. */
  action?: ReactNode
  to?: string
  onClick?: () => void
  disabled?: boolean
  busy?: boolean
  tone?: 'default' | 'danger'
}

export function SettingsRow({
  icon: Icon,
  label,
  detail,
  action,
  to,
  onClick,
  disabled,
  busy,
  tone = 'default',
}: RowProps) {
  const className = `settings-row${tone === 'danger' ? ' settings-row--danger' : ''}${to || onClick ? ' is-interactive' : ''}`
  const content = (
    <>
      {Icon && (
        <span className="settings-row-icon">
          <Icon size={18} aria-hidden="true" />
        </span>
      )}
      <span className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {detail && <span className="settings-row-detail">{detail}</span>}
      </span>
      {action && <span className="settings-row-action">{action}</span>}
      {to && (
        <ChevronRight
          className="settings-row-chevron"
          size={18}
          aria-hidden="true"
        />
      )}
    </>
  )
  if (to)
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  if (onClick)
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={disabled}
        aria-busy={busy}
      >
        {content}
      </button>
    )
  return <div className={className}>{content}</div>
}
