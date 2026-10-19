import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MoveVertical } from 'lucide-react'
import { supabase } from '../../auth/supabase'
import { MixerPanel } from '../mixer/MixerPanel'
import type { ClothingItem } from '../closet/clothing'
import { shareRequest, type SharedCloset } from './api'
import { SharedImage } from './SharedImage'

export function SharePage() {
  const { token = '' } = useParams()
  return <SharedSession key={token} token={token} />
}

function SharedSession({ token }: { token: string }) {
  const [state, setState] = useState<{
    closet: SharedCloset | null
    error: string
  }>({ closet: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  const [topId, setTopId] = useState('')
  const [bottomId, setBottomId] = useState('')
  const [category, setCategory] = useState('tops')
  const [nickname, setNickname] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [limit, setLimit] = useState(24)
  const configured = Boolean(supabase)
  const validToken = /^[0-9a-f]{64}$/.test(token)
  useEffect(() => {
    if (!configured || !validToken) return
    const controller = new AbortController()
    shareRequest<SharedCloset>({ action: 'list', token }, controller.signal)
      .then((closet) => {
        if (!controller.signal.aborted) setState({ closet, error: '' })
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted)
          setState({ closet: null, error: reason.message })
      })
    return () => controller.abort()
  }, [token, configured, validToken, attempt])
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible')
        setAttempt((value) => value + 1)
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])
  useEffect(() => {
    if (!state.closet) return
    const expiry = new Date(state.closet.expiresAt).getTime()
    const timer = window.setTimeout(
      () =>
        setState({
          closet: null,
          error: 'This share link has expired. Ask the owner for a new link.',
        }),
      Math.max(0, expiry - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [state.closet])
  if (!configured || !validToken || state.error)
    return (
      <main className="guest-page">
        <section className="empty-state">
          <h1>
            {!configured
              ? "Sharing isn't connected yet"
              : 'Shared closet unavailable'}
          </h1>
          <p role="alert">
            {state.error ||
              (!configured
                ? 'The owner needs to connect private sharing before this link can be opened.'
                : 'Ask the owner for a valid, unexpired link.')}
          </p>
          {configured && validToken && (
            <button
              className="button-secondary"
              onClick={() => {
                setState({ closet: null, error: '' })
                setAttempt((value) => value + 1)
              }}
            >
              Try again
            </button>
          )}
          <Link to="/mixer" className="text-link">
            Open your own closet
          </Link>
        </section>
      </main>
    )
  if (!state.closet)
    return (
      <main className="guest-page">
        <h1>Opening shared closet</h1>
        <p role="status">Checking access…</p>
      </main>
    )
  const items: ClothingItem[] = state.closet.items.map((item) => ({
    ...item,
    image: '',
  }))
  const topCategory =
    category === 'outerwear' ||
    (!items.some((item) => item.category === 'tops') &&
      items.some((item) => item.category === 'outerwear'))
      ? 'outerwear'
      : 'tops'
  const tops = items.filter((item) => item.category === topCategory)
  const bottoms = items.filter((item) => item.category === 'bottoms')
  const top = tops.find((item) => item.id === topId) ?? tops[0]
  const bottom = bottoms.find((item) => item.id === bottomId) ?? bottoms[0]
  const renderImage = (item: ClothingItem) => (
    <SharedImage key={`${token}-${item.id}`} token={token} item={item} />
  )
  return (
    <main className="guest-sharing">
      <div className="mixer-page" id="shared-mixer">
        <div className="mixer-heading">
          <h1>A closet shared with you</h1>
          <p className="field-hint">
            Choose a pairing and send it to the owner. No account needed.
          </p>
        </div>
        <button
          className="text-link"
          onClick={() => {
            setState({ closet: null, error: '' })
            setAttempt((value) => value + 1)
          }}
        >
          Refresh shared closet
        </button>
        {items.length ? (
          <>
            <div className="vertical-mixer">
              <MixerPanel
                allowAdd={false}
                label="Tops"
                items={tops}
                selectedId={top?.id}
                category={topCategory}
                categoryOptions={['tops', 'outerwear']}
                onCategory={(value) => {
                  setCategory(value)
                  setSent(false)
                }}
                onSelect={(id) => {
                  setTopId(id)
                  setSent(false)
                }}
                renderImage={renderImage}
              />
              <div className="mixer-divider">
                <span />
                <MoveVertical size={16} aria-hidden="true" />
                <span />
              </div>
              <MixerPanel
                allowAdd={false}
                label="Bottoms"
                items={bottoms}
                selectedId={bottom?.id}
                category="bottoms"
                categoryOptions={['bottoms']}
                onCategory={() => {}}
                onSelect={(id) => {
                  setBottomId(id)
                  setSent(false)
                }}
                renderImage={renderImage}
              />
            </div>
            <form
              className="outfit-form"
              onSubmit={async (event) => {
                event.preventDefault()
                if (busy || !top || !bottom) return
                setBusy(true)
                setSubmitError('')
                try {
                  await shareRequest({
                    action: 'suggest',
                    token,
                    topId: top.id,
                    bottomId: bottom.id,
                    nickname,
                    message,
                  })
                  setSent(true)
                } catch (reason) {
                  setSubmitError(
                    reason instanceof Error
                      ? reason.message
                      : 'Could not send. Try again.',
                  )
                } finally {
                  setBusy(false)
                }
              }}
            >
              <details className="optional-details">
                <summary>Add your name or a note (optional)</summary>
                <label htmlFor="guest-name">Your name (optional)</label>
                <input
                  id="guest-name"
                  maxLength={40}
                  autoComplete="nickname"
                  value={nickname}
                  onChange={(event) => {
                    setNickname(event.target.value)
                    setSent(false)
                  }}
                />
                <label htmlFor="guest-message">A note (optional)</label>
                <textarea
                  id="guest-message"
                  maxLength={500}
                  rows={3}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value)
                    setSent(false)
                  }}
                />
              </details>
              <button
                className="button-primary mt-4"
                disabled={busy || sent || !top || !bottom}
                aria-busy={busy}
              >
                {busy
                  ? 'Sending…'
                  : sent
                    ? 'Suggestion sent'
                    : 'Send suggestion'}
              </button>
              {(!top || !bottom) && (
                <p className="field-hint">
                  The owner needs to share a top and bottom before you can
                  suggest a pairing.
                </p>
              )}
              {sent && (
                <p role="status">Your pairing is in the owner’s suggestions.</p>
              )}
              {submitError && (
                <p role="alert" className="form-error">
                  {submitError}
                </p>
              )}
            </form>
          </>
        ) : (
          <div className="notice">
            <h2>This shared closet is empty</h2>
            <p>
              Ask the owner to add clothes or replace an older link, then
              refresh this page.
            </p>
          </div>
        )}
        <details className="optional-details shared-browse">
          <summary>Browse shared pieces ({items.length})</summary>
          <ul className="closet-grid">
            {items.slice(0, limit).map((item) => (
              <li key={item.id}>
                <div className="clothing-tile">{renderImage(item)}</div>
                <h2 className="item-name">{item.name}</h2>
                <p className="field-hint capitalize">{item.category}</p>
                {['tops', 'outerwear', 'bottoms'].includes(item.category) && (
                  <button
                    className="text-link"
                    aria-label={`Try this piece: ${item.name}`}
                    onClick={() => {
                      if (item.category === 'bottoms') setBottomId(item.id)
                      else {
                        setCategory(item.category)
                        setTopId(item.id)
                      }
                      setSent(false)
                      document.getElementById('shared-mixer')?.scrollIntoView()
                    }}
                  >
                    Try this piece<span className="sr-only">: {item.name}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {items.length > limit && (
            <button
              className="button-secondary mt-4"
              onClick={() => setLimit((value) => value + 24)}
            >
              Show more pieces
            </button>
          )}
        </details>
        <p className="footnote">
          {state.closet.scope === 'all'
            ? 'This link shares the owner’s whole closet, including future additions.'
            : 'This older link shows the pieces the owner selected.'}{' '}
          Access can end at any time.
        </p>
      </div>
    </main>
  )
}
