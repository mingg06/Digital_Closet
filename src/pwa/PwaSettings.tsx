import { useContext, useState } from 'react'
import { Check, Smartphone } from 'lucide-react'
import { SettingsGroup, SettingsRow } from '../pages/settings/SettingsGroup'
import { PwaContext } from './PwaContext'

export function PwaSettings() {
  const pwa = useContext(PwaContext)
  const [error, setError] = useState(false)
  return (
    <SettingsGroup
      title="App"
      footer="Opening your closet requires a connection. An already open local wardrobe can still be used offline."
    >
      {pwa?.installed ? (
        <SettingsRow
          icon={Smartphone}
          label="Installed on this device"
          action={<Check size={18} aria-label="Installed" />}
        />
      ) : (
        <SettingsRow
          icon={Smartphone}
          label="Add to home screen"
          detail={
            pwa?.prompt
              ? 'Open your closet like an app.'
              : 'On iPhone, open in Safari, tap Share, then Add to Home Screen. Elsewhere, use Install app in the browser menu.'
          }
          action={
            pwa?.prompt && (
              <button
                type="button"
                className="button-secondary settings-row-button"
                onClick={async () => {
                  setError(false)
                  try {
                    await pwa.install()
                  } catch {
                    setError(true)
                  }
                }}
              >
                Install
              </button>
            )
          }
        />
      )}
      {error && (
        <p role="alert" className="settings-row-message form-error">
          Installation didn’t open. Try your browser’s install menu.
        </p>
      )}
    </SettingsGroup>
  )
}
