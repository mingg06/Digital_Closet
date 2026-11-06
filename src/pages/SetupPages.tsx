import { useState } from 'react'
import { LogIn, LogOut, RefreshCw, Shirt } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useWardrobe } from '../data/WardrobeContext'
import { SharingSettings } from '../features/sharing/SharingSettings'
import { PwaSettings } from '../pwa/PwaSettings'
import { SettingsGroup, SettingsRow } from './settings/SettingsGroup'

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function SettingsPage() {
  const { session, error, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const { mode, wardrobe, refreshPhotos, busy: wardrobeBusy } = useWardrobe()
  const email = session?.user.email
  const cloud = mode === 'cloud'
  return (
    <section className="settings-page">
      <div className="page-heading">
        <h1>Settings</h1>
      </div>

      <div className="settings-profile">
        <span className="settings-avatar" aria-hidden="true">
          {cloud && email ? (
            email[0].toUpperCase()
          ) : (
            <Shirt size={22} strokeWidth={1.5} />
          )}
        </span>
        <div className="settings-profile-text">
          <p className="settings-profile-name">
            {cloud ? (email ?? 'Google account') : 'Local wardrobe'}
          </p>
          <p className="settings-profile-stats">
            {plural(wardrobe.items.length, 'piece')} ·{' '}
            {plural(wardrobe.outfits.length, 'outfit')}
          </p>
        </div>
        <span className="settings-badge">
          {cloud ? 'Cloud' : 'This device'}
        </span>
      </div>

      <SharingSettings />
      <PwaSettings />

      <SettingsGroup
        title="Storage"
        footer={
          cloud
            ? 'Photos are private to your account. Your earlier browser wardrobe stays on this device and is not uploaded automatically.'
            : 'Pieces and outfits live in this browser. Clearing site data removes them.'
        }
      >
        {cloud ? (
          <SettingsRow
            icon={RefreshCw}
            label={wardrobeBusy ? 'Refreshing…' : 'Refresh photos'}
            detail="Reload photo links and retry cleanup"
            onClick={() => void refreshPhotos()}
            disabled={wardrobeBusy}
            busy={wardrobeBusy}
          />
        ) : (
          <SettingsRow
            icon={LogIn}
            label="About sign-in"
            detail="Keep your closet in a private cloud account"
            to="/login"
          />
        )}
      </SettingsGroup>

      {session && (
        <SettingsGroup
          title="Account"
          footer="Signing out ends this browser session. Your cloud wardrobe stays in your account."
        >
          <SettingsRow
            icon={LogOut}
            label={busy ? 'Signing out…' : 'Sign out'}
            tone="danger"
            disabled={busy}
            busy={busy}
            onClick={async () => {
              setBusy(true)
              await signOut()
              setBusy(false)
            }}
          />
          {error && (
            <p role="alert" className="settings-row-message form-error">
              {error}
            </p>
          )}
        </SettingsGroup>
      )}
    </section>
  )
}
