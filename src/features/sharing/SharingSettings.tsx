import { useEffect, useState } from 'react'
import { Copy, Inbox, Link2, Share2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useWardrobe } from '../../data/WardrobeContext'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SettingsGroup, SettingsRow } from '../../pages/settings/SettingsGroup'
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
  const footer =
    'Anyone with the link can browse every piece, including ones you add later, and suggest outfits — and they may forward it. Links expire after seven days; revoking blocks new visits but cannot recall photos already seen.'
  if (mode !== 'cloud')
    return (
      <SettingsGroup title="Sharing">
        <SettingsRow
          icon={Link2}
          label="Sign in to share your closet"
          detail="Sharing needs a cloud wardrobe. Local pieces stay in this browser."
        />
      </SettingsGroup>
    )
  const status = busy
    ? 'Updating sharing…'
    : !ready
      ? 'Sharing status unavailable'
      : active?.share_scope === 'selected'
        ? 'Older link shares selected pieces'
        : active
          ? 'Link active'
          : 'No active link'
  const statusDetail =
    active && !busy
      ? active.share_scope === 'selected'
        ? 'Replace it to share your whole closet.'
        : `Expires ${new Date(active.expires_at).toLocaleString()}${url ? '' : ' · The full link is shown only when created.'}`
      : !count
        ? 'Add a piece to your closet before creating a link.'
        : `Share all ${count} ${count === 1 ? 'piece' : 'pieces'} with friends.`
  return (
    <SettingsGroup title="Sharing" footer={footer}>
      <div className="settings-row settings-share">
        <span
          className={`settings-status-dot${active && !busy ? ' is-active' : ''}`}
          aria-hidden="true"
        />
        <span className="settings-row-text">
          <span className="settings-row-label" role="status">
            {status}
          </span>
          <span className="settings-row-detail">{statusDetail}</span>
        </span>
      </div>
      {url && (
        <div className="settings-share-field">
          <label htmlFor="share-url">Your private share link</label>
          <div className="settings-share-input">
            <input
              id="share-url"
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url)
                  setMessage('Link copied.')
                } catch {
                  setMessage('Select the link above and copy it manually.')
                }
              }}
            >
              <Copy size={16} aria-hidden="true" />
              Copy
            </button>
            {typeof navigator.share === 'function' && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  navigator
                    .share({ title: 'My Digital Closet', url })
                    .catch(() => {})
                }}
              >
                <Share2 size={16} aria-hidden="true" />
                <span className="sr-only">Share link</span>
              </button>
            )}
          </div>
        </div>
      )}
      <div className="settings-actions">
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
            Revoke
          </button>
        )}
      </div>
      {(error || message) && (
        <div className="settings-row-message">
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
        </div>
      )}
      <SettingsRow
        icon={Inbox}
        label="Friend suggestions"
        detail="Outfits friends proposed from your closet"
        to="/suggestions"
      />
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
    </SettingsGroup>
  )
}
