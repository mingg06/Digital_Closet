import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWardrobe } from '../../data/WardrobeContext'
import { upsertItem } from '../../data/wardrobe'
import { categories } from './sampleItems'
import type { Category } from './sampleItems'
import { processImage, validateImageFile } from './processImage'
import type { ImageFit } from './processImage'

export function ItemForm() {
  const { id } = useParams()
  return <ItemEditor key={id ?? 'new'} />
}

function ItemEditor() {
  const { id } = useParams()
  const { wardrobe, update, busy } = useWardrobe()
  const existing = wardrobe.items.find((item) => item.id === id)
  const navigate = useNavigate()
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState<Category | ''>(
    existing?.category ?? '',
  )
  const [color, setColor] = useState(existing?.color ?? '')
  const [subcategory, setSubcategory] = useState(existing?.subcategory ?? '')
  const [tags, setTags] = useState(existing?.tags?.join(', ') ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [fit, setFit] = useState<ImageFit>('contain')
  const [preview, setPreview] = useState(existing?.image ?? '')
  const [processing, setProcessing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [error, setError] = useState('')
  const photoInput = useRef<HTMLInputElement>(null)
  const pending = busy || processing

  function choosePhoto(chosen?: File) {
    if (!chosen) return
    try {
      validateImageFile(chosen)
      setPhotoError('')
      setProcessing(true)
      setFile(chosen)
    } catch (reason) {
      setFile(null)
      setProcessing(false)
      setPreview(existing?.image ?? '')
      setPhotoError((reason as Error).message)
    }
  }

  useEffect(() => {
    if (!file) return
    let active = true
    processImage(file, fit)
      .then((value) => {
        if (active) {
          setPreview(value)
          setPhotoError('')
          setProcessing(false)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setPreview('')
          setPhotoError(
            reason instanceof Error
              ? reason.message
              : 'Could not process photo.',
          )
          setProcessing(false)
        }
      })
    return () => {
      active = false
    }
  }, [file, fit])

  if (id && !existing)
    return (
      <div className="notice">
        <h1>Piece not found</h1>
        <p>This piece may have been removed.</p>
        <Link to="/closet" className="text-link">
          Back to closet
        </Link>
      </div>
    )

  return (
    <section className="form-page">
      <div className="page-heading">
        <p className="eyebrow">YOUR OWN PIECES</p>
        <h1>
          {existing ? 'Edit your piece.' : 'Make room for a new favorite.'}
        </h1>
        <p className="text-muted">
          Photos stay in this browser. Choose the category yourself.
        </p>
      </div>
      <form
        className="item-form"
        onSubmit={async (event) => {
          event.preventDefault()
          if (pending) return
          setError('')
          if (!preview || photoError) {
            setPhotoError('Choose a valid photo before saving.')
            photoInput.current?.focus()
            return
          }
          if (!category) return
          try {
            await update((current) =>
              upsertItem(current, {
                id: existing?.id ?? crypto.randomUUID(),
                name,
                category,
                color,
                subcategory,
                tags: tags
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
                image: preview,
                createdAt: existing?.createdAt ?? new Date().toISOString(),
                isSample: existing?.isSample && !file,
              }),
            )
            navigate('/closet', {
              state: {
                message: existing
                  ? 'Piece updated.'
                  : 'Piece added to this browser.',
              },
            })
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : 'Could not save. Try again.',
            )
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend className="sr-only">Clothing details</legend>
          <label htmlFor="item-photo">
            Photo {existing ? '(optional replacement)' : '(required)'}
          </label>
          <p id="photo-hint" className="field-hint">
            JPEG, PNG, or WebP · up to 15 MB. Photos are compressed before
            saving.
          </p>
          <input
            ref={photoInput}
            id="item-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="photo-hint photo-error"
            aria-invalid={!!photoError}
            onChange={(event) => choosePhoto(event.target.files?.[0])}
          />
          <label className="camera-input" htmlFor="camera-photo">
            Or take a photo
            <input
              id="camera-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(event) => choosePhoto(event.target.files?.[0])}
            />
          </label>
          {photoError && (
            <p id="photo-error" className="form-error" role="alert">
              {photoError}
            </p>
          )}
          {processing && <p role="status">Preparing photo…</p>}
          {preview && (
            <div className="photo-preview">
              <img
                src={preview}
                alt="Clothing preview"
                width="400"
                height="400"
              />
            </div>
          )}
          {file && (
            <>
              <label htmlFor="photo-fit">Photo framing</label>
              <select
                id="photo-fit"
                value={fit}
                onChange={(event) => {
                  setProcessing(true)
                  setFit(event.target.value as ImageFit)
                }}
              >
                <option value="contain">Fit whole photo</option>
                <option value="cover">Crop center to square</option>
              </select>
              <p className="field-hint">
                The preview shows exactly what will be saved.
              </p>
            </>
          )}
          <label htmlFor="item-name">Name (required)</label>
          <input
            id="item-name"
            autoComplete="off"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <label htmlFor="item-category">Category (required)</label>
          <select
            id="item-category"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value as Category)}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <label htmlFor="item-subcategory">Subcategory (optional)</label>
          <input
            id="item-subcategory"
            autoComplete="off"
            maxLength={40}
            placeholder="e.g. T-shirt"
            value={subcategory}
            onChange={(event) => setSubcategory(event.target.value)}
          />
          <label htmlFor="item-color">Color (optional)</label>
          <input
            id="item-color"
            autoComplete="off"
            maxLength={40}
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
          <label htmlFor="item-tags">Tags (optional)</label>
          <input
            id="item-tags"
            autoComplete="off"
            maxLength={310}
            aria-describedby="tags-hint"
            placeholder="casual, weekend"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
          <p id="tags-hint" className="field-hint">
            Separate up to 10 tags with commas. Maximum 30 characters per tag.
          </p>
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            type="submit"
            className="button-primary"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? 'Saving…' : 'Save piece'}
          </button>
          <Link className="button-secondary" to="/closet">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  )
}
