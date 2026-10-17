import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWardrobe } from '../../data/WardrobeContext'
import type { Outfit } from '../../data/wardrobe'
import { ClothingImage } from '../closet/ClothingImage'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'

export function OutfitsPage() {
  const { wardrobe, update, busy, mode } = useWardrobe()
  const [deleting, setDeleting] = useState<Outfit | null>(null)
  const [message, setMessage] = useState('')
  const [limit, setLimit] = useState(12)
  if (!wardrobe.outfits.length)
    return (
      <EmptyState
        eyebrow="YOUR COMBINATIONS"
        title="A home for your favorite pairings"
        description="Choose a top and bottom in the mixer, name your combination, and save it here."
        action="Open the mixer"
        to="/mixer"
      />
    )
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">YOUR COMBINATIONS</p>
        <h1>Good combinations, kept.</h1>
        <p className="text-muted">
          {wardrobe.outfits.length} saved{' '}
          {wardrobe.outfits.length === 1 ? 'outfit' : 'outfits'}{' '}
          {mode === 'cloud' ? 'in your account.' : 'in this browser.'}
        </p>
        <Link className="text-link" to="/mixer">
          Make another outfit
        </Link>
      </div>
      {message && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}
      <ul className="outfits-grid">
        {wardrobe.outfits.slice(0, limit).map((outfit) => {
          const top = wardrobe.items.find(
            (item) => item.id === outfit.topItemId,
          )
          const bottom = wardrobe.items.find(
            (item) => item.id === outfit.bottomItemId,
          )
          const params = new URLSearchParams({
            top: outfit.topItemId,
            bottom: outfit.bottomItemId,
            topCategory: top?.category === 'outerwear' ? 'outerwear' : 'tops',
          })
          return (
            <li key={outfit.id}>
              <article className="outfit-card">
                <div className="outfit-images">
                  {top && <ClothingImage key={top.image} item={top} />}
                  {bottom && <ClothingImage key={bottom.image} item={bottom} />}
                  {(!top || !bottom) && (
                    <p>One of these pieces is unavailable.</p>
                  )}
                </div>
                <h2 className="item-name">{outfit.name}</h2>
                <p className="text-sm text-muted break-words">
                  {top?.name ?? 'Missing top'} +{' '}
                  {bottom?.name ?? 'Missing bottom'}
                </p>
                <p className="field-hint">
                  Saved {new Date(outfit.createdAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-4 mt-2">
                  {top && bottom && (
                    <Link
                      to={`/mixer?${params}`}
                      className="text-link"
                      aria-label={`Mix ${outfit.name}`}
                    >
                      Mix again
                    </Link>
                  )}
                  <button
                    type="button"
                    className="text-link"
                    disabled={busy}
                    aria-label={`Delete outfit ${outfit.name}`}
                    onClick={() => setDeleting(outfit)}
                  >
                    Delete outfit
                  </button>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
      {wardrobe.outfits.length > limit && (
        <button
          className="button-secondary mt-6"
          onClick={() => setLimit((value) => value + 12)}
        >
          Show more outfits
        </button>
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          description="This removes the saved combination. Your clothing pieces will stay in your closet."
          confirmLabel="Delete outfit"
          busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await update((current) => ({
              ...current,
              outfits: current.outfits.filter(
                (outfit) => outfit.id !== deleting.id,
              ),
            }))
            setMessage('Outfit deleted.')
          }}
        />
      )}
    </section>
  )
}
