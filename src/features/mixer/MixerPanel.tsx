import { useRef } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Category, ClothingItem } from '../closet/sampleItems'
import { ClothingImage } from '../closet/ClothingImage'

export function MixerPanel({
  label,
  items,
  selectedId,
  category,
  categoryOptions,
  onCategory,
  onSelect,
}: {
  label: string
  items: ClothingItem[]
  selectedId?: string
  category: Category
  categoryOptions: Category[]
  onCategory: (category: Category) => void
  onSelect: (id: string) => void
}) {
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null)
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  )
  const item = items[index]
  function change(direction: number) {
    if (items.length)
      onSelect(items[(index + direction + items.length) % items.length].id)
  }
  return (
    <section className="mixer-panel" aria-label={`${label} selector`}>
      <div className="panel-heading">
        <h2>{label}</h2>
        <span>
          {items.length ? index + 1 : 0} / {items.length}
        </span>
      </div>
      <div className="panel-filters">
        <label htmlFor={`${label}-category`}>
          Category
          <select
            id={`${label}-category`}
            value={category}
            onChange={(event) => onCategory(event.target.value as Category)}
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${label}-piece`}>
          Piece
          <select
            id={`${label}-piece`}
            disabled={!items.length}
            value={item?.id ?? ''}
            onChange={(event) => onSelect(event.target.value)}
          >
            {!items.length && <option value="">No pieces available</option>}
            {items.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {item ? (
        <>
          <div className="panel-stage">
            <button
              type="button"
              className="arrow-button"
              aria-label={`Previous ${label.toLowerCase()}`}
              onClick={() => change(-1)}
              disabled={items.length < 2}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <div
              className="mixer-image swipe-surface"
              onPointerDown={(event) => {
                if (event.isPrimary === false || event.button > 0) return
                gesture.current = {
                  x: event.clientX,
                  y: event.clientY,
                  id: event.pointerId,
                }
                event.currentTarget.setPointerCapture?.(event.pointerId)
              }}
              onPointerCancel={() => {
                gesture.current = null
              }}
              onPointerUp={(event) => {
                const start = gesture.current
                gesture.current = null
                if (!start || start.id !== event.pointerId) return
                const dx = event.clientX - start.x
                const dy = event.clientY - start.y
                if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5)
                  change(dx < 0 ? 1 : -1)
              }}
            >
              <ClothingImage key={`${item.id}-${item.image}`} item={item} />
            </div>
            <button
              type="button"
              className="arrow-button"
              aria-label={`Next ${label.toLowerCase()}`}
              onClick={() => change(1)}
              disabled={items.length < 2}
            >
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="panel-caption" aria-live="polite" aria-atomic="true">
            <h3>{item.name}</h3>
            <p>{item.color || 'No color specified'}</p>
          </div>
        </>
      ) : (
        <div className="panel-empty">
          <p>No {category} in this closet yet.</p>
          <Link className="text-link" to="/closet/new">
            Add a piece
          </Link>
        </div>
      )}
    </section>
  )
}
