import { useRef, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Category, ClothingItem } from '../closet/clothing'
import { ClothingImage } from '../closet/ClothingImage'

export function MixerPanel({
  label,
  items,
  selectedId,
  category,
  categoryOptions,
  onCategory,
  onSelect,
  renderImage,
  allowAdd = true,
}: {
  label: string
  items: ClothingItem[]
  selectedId?: string
  category: Category
  categoryOptions: Category[]
  onCategory: (category: Category) => void
  onSelect: (id: string) => void
  renderImage?: (item: ClothingItem) => ReactNode
  allowAdd?: boolean
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
        {categoryOptions.length > 1 ? (
          <>
            <h2 className="sr-only">{category}</h2>
            <label className="panel-category" htmlFor={`${label}-category`}>
              <span className="sr-only">Category</span>
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
          </>
        ) : (
          <h2>{category}</h2>
        )}
        <details
          className="panel-picker"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.currentTarget.open = false
              event.currentTarget.querySelector('summary')?.focus()
            }
          }}
        >
          <summary>Choose piece</summary>
          <div className="panel-picker-content">
            <label htmlFor={`${label}-piece`}>Piece</label>
            <select
              id={`${label}-piece`}
              disabled={!items.length}
              value={item?.id ?? ''}
              onChange={(event) => {
                onSelect(event.target.value)
                const details = event.currentTarget.closest('details')!
                details.open = false
                details.querySelector('summary')?.focus()
              }}
            >
              {!items.length && <option value="">No pieces available</option>}
              {items.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>
        </details>
        <span>
          {items.length ? index + 1 : 0} / {items.length}
        </span>
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
              {renderImage ? (
                renderImage(item)
              ) : (
                <ClothingImage key={`${item.id}-${item.image}`} item={item} />
              )}
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
          </div>
        </>
      ) : (
        <div className="panel-empty">
          <p>No {category} in this closet yet.</p>
          {allowAdd && (
            <Link
              className="text-link"
              to={`/closet/new?category=${category}&returnTo=mixer`}
            >
              Add a piece
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
