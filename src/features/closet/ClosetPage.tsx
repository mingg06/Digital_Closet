import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { categories } from './sampleItems'
import type { ClothingItem } from './sampleItems'
import { ClothingImage } from './ClothingImage'
import { useWardrobe } from '../../data/WardrobeContext'
import { removeItem } from '../../data/wardrobe'
import { ConfirmDialog } from '../../components/ConfirmDialog'

const pageSize = 24

export function ClosetPage() {
  const { wardrobe, update, busy } = useWardrobe()
  const [params, setParams] = useSearchParams()
  const { state } = useLocation()
  const [deleting, setDeleting] = useState<ClothingItem | null>(null)
  const [message, setMessage] = useState<string>(
    typeof state?.message === 'string' ? state.message : '',
  )
  const selected = params.get('category') ?? 'all'
  const search = params.get('q') ?? ''
  const rawPage = Number(params.get('page') ?? 1)
  const items = wardrobe.items.filter(
    (item) =>
      (selected === 'all' || item.category === selected) &&
      [item.name, item.color, item.subcategory, ...(item.tags ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Number.isInteger(rawPage)
    ? Math.min(pageCount, Math.max(1, rawPage))
    : 1
  function filter(key: string, value: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }
  const outfitCount = wardrobe.outfits.filter(
    (outfit) =>
      outfit.topItemId === deleting?.id || outfit.bottomItemId === deleting?.id,
  ).length
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">YOUR EVERYDAY EDIT</p>
        <h1>A little less closet chaos.</h1>
        <p className="text-muted">
          Your pieces, organized. Stored only in this browser.
        </p>
      </div>
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <Link to="/closet/new" className="button-primary">
          <Plus size={18} aria-hidden="true" />
          Add a piece
        </Link>
        <div className="search-field">
          <label htmlFor="closet-search" className="sr-only">
            Search pieces
          </label>
          <input
            id="closet-search"
            type="search"
            autoComplete="off"
            placeholder="Search names, colors, or tags"
            value={search}
            onChange={(event) => filter('q', event.target.value)}
          />
        </div>
      </div>
      <div
        className="flex flex-wrap gap-2 mb-6"
        role="group"
        aria-label="Filter clothing by category"
      >
        {['all', ...categories].map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={selected === category}
            className={`filter-chip ${selected === category ? 'selected' : ''}`}
            onClick={() =>
              filter('category', category === 'all' ? '' : category)
            }
          >
            {category === 'all' ? 'All pieces' : category}
          </button>
        ))}
      </div>
      {message && (
        <div className="success-message" role="status">
          {message}
          <button className="text-link" onClick={() => setMessage('')}>
            Dismiss
          </button>
        </div>
      )}
      <p className="text-sm text-muted mb-4" role="status">
        {items.length} {items.length === 1 ? 'piece' : 'pieces'}
        {items.length > pageSize ? ` · Page ${page} of ${pageCount}` : ''}
      </p>
      {items.length ? (
        <ul className="closet-grid">
          {items.slice((page - 1) * pageSize, page * pageSize).map((item) => (
            <li key={item.id}>
              <article>
                <div className="clothing-tile">
                  <ClothingImage key={item.image} item={item} />
                </div>
                <h2 className="item-name">{item.name}</h2>
                <p className="text-sm text-muted capitalize">
                  {item.color ? `${item.color} · ` : ''}
                  {item.category}
                  {item.isSample ? ' · sample' : ''}
                </p>
                {!!item.tags?.length && (
                  <p className="field-hint break-words">
                    {item.tags.join(' · ')}
                  </p>
                )}
                {item.createdAt && (
                  <p className="field-hint">
                    Added {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                )}
                <div className="flex gap-3 mt-2">
                  <Link
                    className="text-link"
                    to={`/closet/${item.id}/edit`}
                    aria-label={`Edit ${item.name}`}
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="text-link"
                    disabled={busy}
                    aria-label={`Delete ${item.name}`}
                    onClick={() => setDeleting(item)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className="notice">
          <h2>
            {wardrobe.items.length
              ? 'No matching pieces'
              : 'Your closet is ready for its first piece'}
          </h2>
          <p>
            {wardrobe.items.length
              ? 'Try another category or search.'
              : 'Add a photo and choose a category to get started.'}
          </p>
          {wardrobe.items.length ? (
            <button
              className="button-secondary mt-4"
              onClick={() => setParams({})}
            >
              Show all pieces
            </button>
          ) : (
            <Link className="button-primary mt-4" to="/closet/new">
              Add your first piece
            </Link>
          )}
        </div>
      )}
      {pageCount > 1 && (
        <nav
          aria-label="Closet pages"
          className="flex justify-between gap-4 mt-8"
        >
          <button
            className="button-secondary"
            disabled={page === 1}
            onClick={() =>
              setParams((current) => {
                const next = new URLSearchParams(current)
                next.set('page', String(page - 1))
                return next
              })
            }
          >
            Previous page
          </button>
          <button
            className="button-secondary"
            disabled={page === pageCount}
            onClick={() =>
              setParams((current) => {
                const next = new URLSearchParams(current)
                next.set('page', String(page + 1))
                return next
              })
            }
          >
            Next page
          </button>
        </nav>
      )}
      <p className="footnote">
        Local storage is specific to this browser. Clearing site data removes
        your pieces and outfits.
      </p>
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          description={`This removes the piece from this browser${outfitCount ? ` and ${outfitCount} saved ${outfitCount === 1 ? 'outfit' : 'outfits'} using it` : ''}. This cannot be undone.`}
          confirmLabel="Delete piece"
          busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await update((current) => removeItem(current, deleting.id))
            setMessage('Piece removed.')
          }}
        />
      )}
    </section>
  )
}
