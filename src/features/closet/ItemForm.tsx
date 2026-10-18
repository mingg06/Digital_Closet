import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useWardrobe } from '../../data/WardrobeContext'
import { upsertItem } from '../../data/wardrobe'
import { categories } from './clothing'
import type { Category } from './clothing'
import { processImage, validateImageFile } from './processImage'
import type { ImageFit } from './processImage'
import {
  clearItemDraft,
  getDraftStatus,
  readItemDraft,
  subscribeDraftStatus,
  writeItemDraft,
} from './itemDraft'

export function ItemForm() {
  const { id } = useParams()
  const [entry, setEntry] = useState(0)
  return (
    <>
      {entry > 0 && (
        <p role="status" className="success-message form-page">
          Piece saved. Add your next piece.
        </p>
      )}
      <ItemEditor
        key={`${id ?? 'new'}-${entry}`}
        onAnother={() => setEntry((value) => value + 1)}
      />
    </>
  )
}

function ItemEditor({ onAnother }: { onAnother: () => void }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { session } = useAuth()
  const { wardrobe, update, busy, mode } = useWardrobe()
  const existing = wardrobe.items.find((item) => item.id === id)
  const draftKey = `digital-closet:draft:${mode === 'cloud' ? session?.user.id : 'local'}:${id ?? 'new'}`
  const baseline = JSON.stringify(
    existing
      ? [
          existing.name,
          existing.category,
          existing.color,
          existing.subcategory,
          existing.tags,
          existing.storagePath ?? existing.image,
        ]
      : null,
  )
  const [draft] = useState(() => readItemDraft(draftKey, baseline))
  const suggestedCategory = params.get('category')
  const navigate = useNavigate()
  const [name, setName] = useState(draft?.name ?? existing?.name ?? '')
  const [category, setCategory] = useState<Category | ''>(
    draft?.category ??
      existing?.category ??
      (categories.includes(suggestedCategory as Category)
        ? (suggestedCategory as Category)
        : ''),
  )
  const [color, setColor] = useState(draft?.color ?? existing?.color ?? '')
  const [subcategory, setSubcategory] = useState(
    draft?.subcategory ?? existing?.subcategory ?? '',
  )
  const [tags, setTags] = useState(
    draft?.tags ?? existing?.tags?.join(', ') ?? '',
  )
  const [file, setFile] = useState<File | null>(null)
  const [fit, setFit] = useState<ImageFit>('contain')
  const [preview, setPreview] = useState(
    draft?.preview || existing?.image || '',
  )
  const [processing, setProcessing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [error, setError] = useState('')
  const photoInput = useRef<HTMLInputElement>(null)
  const draftStorage = useSyncExternalStore(subscribeDraftStatus, () =>
    getDraftStatus(draftKey),
  )
  const draftStatus =
    draftStorage === 'persistent'
      ? 'Draft kept in this tab, including after a reload.'
      : draftStorage === 'memory'
        ? 'Draft kept while you navigate. Browser storage is full or unavailable; save before reloading or closing this tab.'
        : ''
  const pending = busy || processing

  useEffect(() => {
    const changed =
      name !== (existing?.name ?? '') ||
      category !== (existing?.category ?? '') ||
      color !== (existing?.color ?? '') ||
      subcategory !== (existing?.subcategory ?? '') ||
      tags !== (existing?.tags?.join(', ') ?? '') ||
      preview !== (existing?.image ?? '')
    if (!changed) {
      clearItemDraft(draftKey)
      return
    }
    const kept = writeItemDraft(draftKey, {
      baseline,
      name,
      category,
      color,
      subcategory,
      tags,
      // Never persist a signed cloud URL in a draft.
      preview: preview.startsWith('data:image/jpeg;') ? preview : '',
    })
    if (!kept) {
      const warn = (event: BeforeUnloadEvent) => {
        event.preventDefault()
        event.returnValue = ''
      }
      window.addEventListener('beforeunload', warn)
      return () => window.removeEventListener('beforeunload', warn)
    }
  }, [
    baseline,
    category,
    color,
    draftKey,
    existing,
    name,
    preview,
    subcategory,
    tags,
  ])

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
        <h1>{existing ? 'Edit your piece' : 'Add a piece'}</h1>
        <p className="text-muted">
          {mode === 'cloud'
            ? 'Photos are saved privately to your account.'
            : 'Photos stay in this browser.'}{' '}
          Choose the category yourself.
        </p>
      </div>
      {draftStatus && <p className="field-hint">{draftStatus}</p>}
      {draft && (
        <p className="field-hint">Your unfinished piece has been restored.</p>
      )}
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
            const itemId = existing?.id ?? crypto.randomUUID()
            await update((current) =>
              upsertItem(current, {
                id: itemId,
                name,
                category,
                color,
                subcategory,
                tags: tags
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
                image: preview,
                storagePath: existing?.storagePath,
                createdAt: existing?.createdAt ?? new Date().toISOString(),
              }),
            )
            clearItemDraft(draftKey)
            const submitter = (event.nativeEvent as SubmitEvent).submitter
            if (submitter?.getAttribute('value') === 'another') {
              onAnother()
              return
            }
            const returning =
              params.get('returnTo') === 'mixer' &&
              ['tops', 'outerwear', 'bottoms'].includes(category)
            const selection = new URLSearchParams(
              category === 'bottoms'
                ? { bottom: itemId }
                : { top: itemId, topCategory: category },
            )
            navigate(returning ? `/mixer?${selection}` : '/closet', {
              state: {
                message: existing
                  ? 'Piece updated.'
                  : mode === 'cloud'
                    ? 'Piece saved to your account.'
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
          <div className="photo-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => photoInput.current?.click()}
            >
              Choose photo
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => document.getElementById('camera-photo')?.click()}
            >
              Take photo
            </button>
          </div>
          <input
            className="sr-only"
            ref={photoInput}
            id="item-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="photo-hint photo-error"
            aria-invalid={!!photoError}
            onChange={(event) => choosePhoto(event.target.files?.[0])}
          />
          <label className="sr-only" htmlFor="camera-photo">
            Camera photo
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
          <details
            className="optional-details"
            open={
              existing &&
              !!(
                existing.color ||
                existing.subcategory ||
                existing.tags?.length
              )
                ? true
                : undefined
            }
          >
            <summary>
              More details <span className="text-muted">(optional)</span>
            </summary>
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
          </details>
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
          {!existing && (
            <button
              type="submit"
              value="another"
              className="button-secondary"
              disabled={pending}
            >
              Save and add another
            </button>
          )}
          <button
            type="button"
            className="text-link"
            disabled={pending}
            onClick={() => {
              clearItemDraft(draftKey)
              navigate('/closet')
            }}
          >
            Discard draft
          </button>
          <Link className="text-link" to="/closet">
            Back to closet
          </Link>
        </div>
      </form>
    </section>
  )
}
