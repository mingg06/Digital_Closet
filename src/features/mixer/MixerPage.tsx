import { useState } from 'react'
import { ArrowLeft, ArrowRight, MoveVertical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { sampleItems } from '../closet/sampleItems'
import type { ClothingItem } from '../closet/sampleItems'
import { ClothingImage } from '../closet/ClothingImage'

function MixerPanel({
  label,
  items,
}: {
  label: string
  items: ClothingItem[]
}) {
  const [index, setIndex] = useState(0)
  const item = items[index]
  if (!item)
    return (
      <section className="notice">
        <h2>{label}</h2>
        <p>No sample pieces available.</p>
      </section>
    )
  const change = (direction: number) =>
    setIndex((current) => (current + direction + items.length) % items.length)
  return (
    <section className="mixer-panel" aria-label={`${label} selector`}>
      <div className="panel-heading">
        <h2>{label}</h2>
        <span>
          {index + 1} / {items.length}
        </span>
      </div>
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
        <div className="mixer-image">
          <ClothingImage key={item.id} item={item} />
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
        <p>{item.color}</p>
      </div>
    </section>
  )
}

export function MixerPage() {
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
            items={sampleItems.filter((item) => item.category === 'tops')}
          />
          <div className="mixer-divider">
            <span />
            <MoveVertical size={16} aria-hidden="true" />
            <span />
          </div>
          <MixerPanel
            label="Bottoms"
            items={sampleItems.filter((item) => item.category === 'bottoms')}
          />
        </div>
        <aside className="mixer-note">
          <p className="eyebrow">THE OUTFIT MIXER</p>
          <h2>
            Same pieces.
            <br />
            Fresh perspective.
          </h2>
          <p>
            Keep the top. Change the bottoms. Each panel moves on its own, so
            you can find your favorite combination.
          </p>
          <Link to="/closet" className="text-link">
            Explore all 9 sample pieces{' '}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <div className="note-caption">
            Just exploring for now.
            <br />
            Saving outfits and swipe gestures come in later phases.
          </div>
        </aside>
      </div>
    </section>
  )
}
