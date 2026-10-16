import { useState } from 'react'
import { ArrowRight, MoveVertical } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useWardrobe } from '../../data/WardrobeContext'
import { addOutfit } from '../../data/wardrobe'
import { MixerPanel } from './MixerPanel'

export function MixerPage() {
  const { wardrobe, update, busy } = useWardrobe()
  const [params, setParams] = useSearchParams()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const topCategory =
    params.get('topCategory') === 'outerwear' ? 'outerwear' : 'tops'
  const tops = wardrobe.items.filter((item) => item.category === topCategory)
  const bottoms = wardrobe.items.filter((item) => item.category === 'bottoms')
  const top = tops.find((item) => item.id === params.get('top')) ?? tops[0]
  const bottom =
    bottoms.find((item) => item.id === params.get('bottom')) ?? bottoms[0]
  function select(key: string, value: string) {
    setSaved(false)
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set(key, value)
        return next
      },
      { replace: true },
    )
  }
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">A NEW WAY TO GET DRESSED</p>
        <h1>Your closet. More possibilities.</h1>
        <p className="text-muted">Find a pairing that feels like you.</p>
      </div>
      <div className="mixer-layout">
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
        <aside className="mixer-note">
          <p className="eyebrow">THE OUTFIT MIXER</p>
          <h2>
            Same pieces.
            <br />
            Fresh perspective.
          </h2>
          <p>Swipe a piece or use its arrows. Each panel moves on its own.</p>
          <Link to="/closet" className="text-link">
            Explore your {wardrobe.items.length} pieces{' '}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <form
            className="outfit-form"
            onSubmit={async (event) => {
              event.preventDefault()
              setError('')
              setSaved(false)
              if (!top || !bottom) return
              try {
                await update((current) =>
                  addOutfit(current, {
                    id: crypto.randomUUID(),
                    name,
                    topItemId: top.id,
                    bottomItemId: bottom.id,
                    createdAt: new Date().toISOString(),
                  }),
                )
                setSaved(true)
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
            <label htmlFor="outfit-name">Name this outfit</label>
            <input
              id="outfit-name"
              autoComplete="off"
              required
              maxLength={80}
              value={name}
              placeholder="e.g. Easy Sunday"
              onChange={(event) => {
                setName(event.target.value)
                setSaved(false)
              }}
            />
            <button
              type="submit"
              className="button-primary mt-4"
              disabled={busy || !top || !bottom}
              aria-busy={busy}
            >
              {busy ? 'Saving…' : 'Save outfit'}
            </button>
            {(!top || !bottom) && (
              <p className="field-hint mt-2">
                Add a top and a bottom to save an outfit.
              </p>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {saved && (
              <p role="status" className="mt-4">
                Outfit saved in this browser.{' '}
                <Link to="/outfits" className="text-link">
                  View saved outfits
                </Link>
              </p>
            )}
          </form>
          <div className="note-caption">
            Your wardrobe and combinations stay on this device. Account sync and
            private sharing aren't connected yet.
          </div>
        </aside>
      </div>
    </section>
  )
}
