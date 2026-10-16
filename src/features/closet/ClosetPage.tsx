import { useSearchParams } from 'react-router-dom'
import { categories, sampleItems } from './sampleItems'
import { ClothingImage } from './ClothingImage'

export function ClosetPage() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('category') ?? 'all'
  const items = sampleItems.filter(
    (item) => selected === 'all' || item.category === selected,
  )
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">YOUR EVERYDAY EDIT</p>
        <h1>A little less closet chaos.</h1>
        <p className="text-muted">
          Meet the sample wardrobe. Your own pieces come next.
        </p>
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
            onClick={() => setParams(category === 'all' ? {} : { category })}
          >
            {category === 'all' ? 'All pieces' : category}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted mb-4" role="status">
        {items.length} sample {items.length === 1 ? 'piece' : 'pieces'}
      </p>
      {items.length ? (
        <ul className="closet-grid">
          {items.map((item) => (
            <li key={item.id}>
              <article>
                <div className="clothing-tile">
                  <ClothingImage item={item} />
                </div>
                <h2 className="item-name">{item.name}</h2>
                <p className="text-sm text-muted capitalize">
                  {item.color} · {item.category}
                </p>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className="notice">
          <h2>No pieces in this category</h2>
          <p>Choose another category to explore the sample wardrobe.</p>
          <button
            className="button-secondary mt-4"
            onClick={() => setParams({})}
          >
            Show all pieces
          </button>
        </div>
      )}
      <p className="footnote">
        Photo uploads, editing, and your personal wardrobe arrive in the next
        phases.
      </p>
    </section>
  )
}
