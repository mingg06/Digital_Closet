import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useWardrobe } from '../../data/WardrobeContext'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { activeShare, shareRequest, type ShareLink } from './api'

export function SharingSettings() {
  const { session } = useAuth()
  const { wardrobe, mode } = useWardrobe()
  const [active, setActive] = useState<ShareLink | null>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState<'create' | 'revoke' | null>(null)
  const ownerId = session?.user.id
  const count = wardrobe.items.length
  useEffect(() => {
    if (!ownerId || mode !== 'cloud') return
    let current = true
    activeShare(ownerId)
      .then((link) => {
        if (current) {
          setActive(link)
          setReady(true)
        }
      })
      .catch((reason: Error) => {
        if (current) setError(reason.message)
      })
      .finally(() => {
        if (current) setBusy(false)
      })
    return () => {
      current = false
    }
  }, [ownerId, mode])

  async function change(action: 'create' | 'revoke') {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await shareRequest<{
        id?: string
        expiresAt?: string
        token?: string
        scope?: string
      }>({ action })
      if (action === 'create' && result.scope !== 'all')
        throw new Error(
          'Apply the whole-closet sharing migration, then create a new link.',
        )
      setUrl(
        result.token ? `${window.location.origin}/share/${result.token}` : '',
      )
      setActive(
        result.id && result.expiresAt
          ? {
              id: result.id,
              expires_at: result.expiresAt,
              created_at: new Date().toISOString(),
              share_scope: 'all',
            }
          : null,
      )
      setMessage(
        action === 'create'
          ? 'New link created. Previous links no longer work.'
          : 'Link revoked. New requests through it are blocked.',
      )
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not update sharing. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  if (mode !== 'cloud')
    return (
      <div className="notice mt-4">
        <h2>Private sharing</h2>
        <p>
          Sharing needs a signed-in cloud wardrobe. Your local pieces stay in
          this browser.
        </p>
      </div>
    )
  return (
    <section className="notice mt-4" aria-label="Private sharing">
      <h2>Private sharing</h2>
      <p>
        Share your whole closet, including clothes you add later. Anyone with
        the link can browse all your pieces and suggest outfits, and recipients
        may forward it.
      </p>
      <Link to="/closet" className="text-link">
        View your closet ({count} pieces)
      </Link>
      <p>
        Links expire after seven days. Revoking a link blocks future requests;
        photos already viewed or saved cannot be taken back.
      </p>
      {busy && <p role="status">Updating sharing…</p>}
      {active && (
        <p>
          Current link expires {new Date(active.expires_at).toLocaleString()}.
        </p>
      )}
      {active?.share_scope === 'selected' && (
        <p>
          This older link shares selected pieces. Replace it to share your whole
          closet.
        </p>
      )}
      {active && !url && (
        <p>
          The full link is shown only when created. Create a replacement if you
          no longer have it.
        </p>
      )}
      {url && (
        <div className="mt-4">
          <label htmlFor="share-url">Your private share link</label>
          <input
            id="share-url"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            className="text-link"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url)
                setMessage('Link copied.')
              } catch {
                setMessage('Select the link above and copy it manually.')
              }
            }}
          >
            Copy link
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-4">
        <button
          className="button-primary"
          disabled={busy || !ready || !count}
          onClick={() =>
            active ? setConfirm('create') : void change('create')
          }
        >
          {active ? 'Replace link' : 'Create share link'}
        </button>
        {active && (
          <button
            className="button-secondary"
            disabled={busy}
            onClick={() => setConfirm('revoke')}
          >
            Revoke link
          </button>
        )}
      </div>
      {!count && (
        <p className="field-hint">
          Add a piece to your closet before creating a link.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <Link to="/suggestions" className="text-link mt-4">
        View friend suggestions
      </Link>
      {confirm && (
        <ConfirmDialog
          title={
            confirm === 'create' ? 'Replace this link?' : 'Revoke this link?'
          }
          description={
            confirm === 'create'
              ? 'The new link will share your whole closet, including future additions. The current link will stop working. Existing suggestions will remain.'
              : 'Everyone using the current link will lose access. Suggestions already sent will remain in your inbox.'
          }
          confirmLabel={confirm === 'create' ? 'Replace link' : 'Revoke link'}
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await change(confirm)
            setConfirm(null)
          }}
        />
      )}
    </section>
  )
}
