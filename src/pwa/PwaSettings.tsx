import { useContext, useState } from 'react'
import { PwaContext } from './PwaContext'

export function PwaSettings() {
  const pwa = useContext(PwaContext)
  const [error, setError] = useState(false)
  return (
    <div className="notice mt-4">
      <h2>Keep your closet close.</h2>
      {pwa?.installed ? (
        <p>Digital Closet is installed on this device.</p>
      ) : (
        <>
          <p>Add Digital Closet to your home screen for quicker access.</p>
          {pwa?.prompt ? (
            <button
              className="button-primary mt-4"
              onClick={async () => {
                setError(false)
                try {
                  await pwa.install()
                } catch {
                  setError(true)
                }
              }}
            >
              Install Digital Closet
            </button>
          ) : (
            <p>
              On iPhone, open this site in Safari, tap Share, then Add to Home
              Screen. In other browsers, look for Install app in the browser
              menu.
            </p>
          )}
          {error && (
            <p role="alert">
              Installation didn’t open. Try your browser’s install menu.
            </p>
          )}
        </>
      )}
      <p>
        Opening your closet requires a connection. An already open local
        wardrobe can still be used offline.
      </p>
    </div>
  )
}
