import { useEffect, useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { PwaContext, type InstallPrompt } from './PwaContext'

export function PwaProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  )
  const [online, setOnline] = useState(navigator.onLine)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const didInstall = () => {
      setInstalled(true)
      setPrompt(null)
    }
    const connectivity = () => setOnline(navigator.onLine)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', didInstall)
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', didInstall)
      window.removeEventListener('online', connectivity)
      window.removeEventListener('offline', connectivity)
    }
  }, [])

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  return (
    <PwaContext value={{ installed, prompt, install }}>
      {!online && (
        <div className="pwa-offline" role="status">
          You’re offline. Reconnect before making cloud changes or sending
          suggestions.
        </div>
      )}
      {children}
      {needRefresh && (
        <aside className="pwa-update notice" aria-label="App update">
          <p role="status">Update available. Save your work, then reload.</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <button
              className="button-primary"
              onClick={() => void updateServiceWorker(true)}
            >
              Reload app
            </button>
            <button
              className="button-secondary"
              onClick={() => setNeedRefresh(false)}
            >
              Later
            </button>
          </div>
        </aside>
      )}
    </PwaContext>
  )
}
