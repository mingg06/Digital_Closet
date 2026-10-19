import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useWardrobe } from '../../data/WardrobeContext'
import { ClothingImage } from '../closet/ClothingImage'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { deleteSuggestion, readSuggestions, type Suggestion } from './api'

export function SuggestionsPage() {
  const { session } = useAuth()
  const { wardrobe, mode } = useWardrobe()
  const [items, setItems] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ownerId = session?.user.id
  useEffect(() => {
    if (!ownerId || mode !== 'cloud') return
    let current = true
    readSuggestions(ownerId, page)
      .then((value) => {
        if (current) {
          setItems(value)
          setError('')
        }
      })
      .catch((reason: Error) => {
        if (current) setError(reason.message)
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [ownerId, mode, page, attempt])
  return (
    <section>
      <div className="page-heading">
        <h1>Friend suggestions</h1>
        <p className="text-muted">Pairings sent through your private link.</p>
        <Link to="/settings" className="text-link">
          Manage sharing
        </Link>
      </div>
      {mode !== 'cloud' ? (
        <div className="notice">
          <h2>Connect a cloud wardrobe</h2>
          <p>Private sharing and suggestions need a signed-in account.</p>
        </div>
      ) : (
        <>
          <button
            className="text-link"
            disabled={loading}
            onClick={() => {
              setLoading(true)
              setAttempt((value) => value + 1)
            }}
          >
            Refresh suggestions
          </button>
          {loading ? (
            <p role="status">Loading suggestions…</p>
          ) : error ? (
            <p role="alert" className="form-error">
              {error}
            </p>
          ) : items.length ? (
            <ul className="outfits-grid">
              {items.map((suggestion) => {
                const top = wardrobe.items.find(
                  (item) => item.id === suggestion.top_item_id,
                )
                const bottom = wardrobe.items.find(
                  (item) => item.id === suggestion.bottom_item_id,
                )
                const query = new URLSearchParams({
                  top: suggestion.top_item_id,
                  bottom: suggestion.bottom_item_id,
                  topCategory: top?.category ?? 'tops',
                })
                return (
                  <li key={suggestion.id}>
                    <article className="outfit-card">
                      <div className="outfit-images">
                        {top && <ClothingImage item={top} />}
                        {bottom && <ClothingImage item={bottom} />}
                      </div>
                      <h2 className="item-name">
                        {suggestion.nickname || 'A friend'}’s pairing
                      </h2>
                      <p className="text-sm">
                        {top?.name ?? 'Unavailable top'} +{' '}
                        {bottom?.name ?? 'Unavailable bottom'}
                      </p>
                      {suggestion.message && (
                        <p className="suggestion-message">
                          {suggestion.message}
                        </p>
                      )}
                      <p className="field-hint">
                        {new Date(suggestion.created_at).toLocaleString()}
                      </p>
                      <div className="flex gap-4">
                        {top && bottom && (
                          <Link className="text-link" to={`/mixer?${query}`}>
                            Try this outfit
                          </Link>
                        )}
                        <button
                          className="text-link"
                          onClick={() => setDeleting(suggestion.id)}
                        >
                          Dismiss
                          <span className="sr-only">
                            {' '}
                            suggestion from {suggestion.nickname || 'a friend'}
                          </span>
                        </button>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="notice">
              <h2>No suggestions on this page</h2>
              <p>Friends can send a pairing from your shared closet.</p>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              className="button-secondary"
              disabled={!page || loading}
              onClick={() => {
                setLoading(true)
                setPage((value) => value - 1)
              }}
            >
              Previous page
            </button>
            <button
              className="button-secondary"
              disabled={items.length < 24 || loading || !!error}
              onClick={() => {
                setLoading(true)
                setPage((value) => value + 1)
              }}
            >
              Next page
            </button>
          </div>
        </>
      )}
      {deleting && ownerId && (
        <ConfirmDialog
          title="Dismiss this suggestion?"
          description="Your clothing and saved outfits will stay in your closet."
          confirmLabel="Dismiss suggestion"
          busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            setBusy(true)
            try {
              await deleteSuggestion(ownerId, deleting)
              setItems((value) => value.filter((item) => item.id !== deleting))
            } finally {
              setBusy(false)
            }
          }}
        />
      )}
    </section>
  )
}
