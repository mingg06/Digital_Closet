import { ArrowRight, Layers2 } from 'lucide-react'
import { Link } from 'react-router-dom'

type Props = {
  eyebrow: string
  title: string
  description: string
  action: string
  to: string
}

export function EmptyState({ eyebrow, title, description, action, to }: Props) {
  return (
    <section className="empty-state">
      <Layers2 size={36} strokeWidth={1.25} aria-hidden="true" />
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="text-muted max-w-md">{description}</p>
      <Link className="button-primary" to={to}>
        {action}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </section>
  )
}
