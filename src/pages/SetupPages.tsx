import { Link } from 'react-router-dom'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useWardrobe } from '../data/WardrobeContext'

export function SettingsPage() {
  const { session, error, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const { mode, refreshPhotos, busy: wardrobeBusy } = useWardrobe()
  return (
    <section className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">MAKE IT YOURS</p>
        <h1>Your closet, your space.</h1>
        <p className="text-muted">
          {mode === 'cloud'
            ? 'Your pieces and outfits are saved to your account.'
            : 'Your pieces and outfits stay in this browser.'}
        </p>
      </div>
      {session && (
        <div className="notice mb-4">
          <h2>Account</h2>
          <p>Signed in as {session.user.email ?? 'a Google user'}.</p>
          <p>
            Signing out ends this browser session. Your cloud wardrobe stays in
            your account.
          </p>
          {error && <p role="alert">{error}</p>}
          <button
            className="button-primary mt-4"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await signOut()
              setBusy(false)
            }}
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
      <div className="notice">
        <h2>{mode === 'cloud' ? 'Cloud wardrobe' : 'Local wardrobe'}</h2>
        <p>
          {mode === 'cloud'
            ? 'Photos are private and your changes require an internet connection. Your earlier browser wardrobe has been kept on this device and is not automatically uploaded.'
            : 'Photos and saved outfits are stored on this device using browser storage. Clearing site data removes this wardrobe.'}
        </p>
        {mode === 'cloud' ? (
          <button
            className="text-link mt-4"
            disabled={wardrobeBusy}
            onClick={() => void refreshPhotos()}
          >
            Refresh photos and retry cleanup
          </button>
        ) : (
          <Link to="/login" className="text-link mt-4">
            About sign-in <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="notice mt-4">
        <h2>Private sharing</h2>
        <p>Sharing will be available after secure access is connected.</p>
      </div>
    </section>
  )
}

export function SharePage() {
  // Never render demo or private wardrobe records on an unvalidated share route.
  return (
    <main className="guest-page">
      <section className="empty-state">
        <LockKeyhole size={36} aria-hidden="true" />
        <p className="eyebrow">DIGITAL CLOSET</p>
        <h1>Sharing isn't available yet</h1>
        <p className="text-muted max-w-md">
          This version cannot validate private share links. No wardrobe is
          available through this address.
        </p>
        <Link to="/mixer" className="button-primary">
          Open Digital Closet <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </main>
  )
}
