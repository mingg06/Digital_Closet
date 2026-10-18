import { useState } from 'react'
import { MoveVertical } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useWardrobe } from '../../data/WardrobeContext'
import { addOutfit } from '../../data/wardrobe'
import { MixerPanel } from './MixerPanel'

export function MixerPage() {
  const { wardrobe, update, busy, mode } = useWardrobe()
  const [params, setParams] = useSearchParams()
  const { state } = useLocation()
  const [name, setName] = useState('')
  const [naming, setNaming] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const hasTops = wardrobe.items.some((item) => item.category === 'tops')
  const hasOuterwear = wardrobe.items.some(
    (item) => item.category === 'outerwear',
  )
  const topCategory =
    params.get('topCategory') === 'outerwear' ||
    (!params.has('topCategory') && !hasTops && hasOuterwear)
      ? 'outerwear'
      : 'tops'
  const tops = wardrobe.items.filter((item) => item.category === topCategory)
  const bottoms = wardrobe.items.filter((item) => item.category === 'bottoms')
  const top = tops.find((item) => item.id === params.get('top')) ?? tops[0]
  const bottom =
    bottoms.find((item) => item.id === params.get('bottom')) ?? bottoms[0]
  function select(key: string, value: string) {
    setSaved(false)
    setError('')
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set(key, value)
        return next
      },
      { replace: true },
    )
  }
  if ((!hasTops && !hasOuterwear) || !bottoms.length) {
    const missing = !hasTops && !hasOuterwear ? 'tops' : 'bottoms'
    return (
      <section className="first-outfit">
        <h1>Make your first outfit</h1>
        {typeof state?.message === 'string' && (
          <p role="status">{state.message}</p>
        )}
        <p className="text-muted">
          Add a top and a bottom, then try them together.
        </p>
        <ul className="first-outfit-checklist">
          <li>{hasTops || hasOuterwear ? 'Top ready' : 'Add a top'}</li>
          <li>{bottoms.length ? 'Bottom ready' : 'Add a bottom'}</li>
        </ul>
        <Link
          className="button-primary"
          to={`/closet/new?category=${missing}&returnTo=mixer`}
        >
          {missing === 'tops' ? 'Add a top' : 'Add a bottom'}
        </Link>
        <Link className="text-link" to="/closet">
          Explore your closet
        </Link>
      </section>
    )
  }
  return (
    <section className="mixer-page">
      <div className="mixer-heading">
        <h1>Outfit mixer</h1>
        <p className="field-hint">
          Swipe or use the arrows. Each piece moves independently.
        </p>
      </div>
      <div className="vertical-mixer">
        <MixerPanel
          label="Tops"
          items={tops}
          selectedId={top?.id}
          category={topCategory}
          categoryOptions={['tops', 'outerwear']}
          onCategory={(category) => select('topCategory', category)}
          onSelect={(id) => select('top', id)}
        />
        <div className="mixer-divider">
          <span />
          <MoveVertical size={16} aria-hidden="true" />
          <span />
        </div>
        <MixerPanel
          label="Bottoms"
          items={bottoms}
          selectedId={bottom?.id}
          category="bottoms"
          categoryOptions={['bottoms']}
          onCategory={() => {}}
          onSelect={(id) => select('bottom', id)}
        />
      </div>
      <div className="mixer-save">
        {naming ? (
          <form
            className="outfit-form"
            onSubmit={async (event) => {
              event.preventDefault()
              if (busy || !top || !bottom) return
              setError('')
              setSaved(false)
              try {
                await update((current) =>
                  addOutfit(current, {
                    id: crypto.randomUUID(),
                    name: name.trim() || `Outfit ${current.outfits.length + 1}`,
                    topItemId: top.id,
                    bottomItemId: bottom.id,
                    createdAt: new Date().toISOString(),
                  }),
                )
                setSaved(true)
                setNaming(false)
                setName('')
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : 'Could not save this outfit. Try again.',
                )
              }
            }}
          >
            <label htmlFor="outfit-name">
              Name this outfit{' '}
              <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              id="outfit-name"
              autoFocus
              autoComplete="off"
              maxLength={80}
              value={name}
              placeholder={`Outfit ${wardrobe.outfits.length + 1}`}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="flex gap-3 mt-3">
              <button
                type="submit"
                className="button-primary"
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? 'Saving…' : 'Save outfit'}
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={busy}
                onClick={() => {
                  setNaming(false)
                  setError('')
                }}
              >
                Keep mixing
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="button-primary w-full"
            disabled={!top || !bottom}
            onClick={() => {
              setNaming(true)
              setSaved(false)
            }}
          >
            Save outfit
          </button>
        )}
        {(!top || !bottom) && (
          <p className="field-hint">
            Choose a category with a piece to save an outfit.
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="save-confirmation">
            {mode === 'cloud'
              ? 'Outfit saved to your account.'
              : 'Outfit saved in this browser.'}{' '}
            <Link to="/outfits" className="text-link">
              View saved outfits
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}
