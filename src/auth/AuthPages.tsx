import { useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { configured, loading, session } = useAuth()
  if (loading) return <p role="status">Checking your session…</p>
  if (configured && !session) return <Navigate to="/login" replace />
  return children
}

export function LoginPage() {
  const { configured, loading, session, error, signIn } = useAuth()
  const [busy, setBusy] = useState(false)
  const location = useLocation()
  const callbackFailed = new URLSearchParams(location.search).has('authError')
  if (loading) return <p role="status">Checking your session…</p>
  if (session) return <Navigate to="/mixer" replace />
  return (
    <main className="guest-page">
      <section className="empty-state">
        <p className="eyebrow">YOUR PERSONAL WARDROBE</p>
        <h1>
          {configured
            ? 'Sign in to Digital Closet'
            : "Sign-in isn't connected yet"}
        </h1>
        <p>
          {configured
            ? 'Continue with Google to open your private cloud wardrobe.'
            : 'Add a valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the development server.'}
        </p>
        {(error || callbackFailed) && (
          <p role="alert">
            {error ?? 'Google sign-in did not finish. Please try again.'}
          </p>
        )}
        {configured ? (
          <button
            className="button-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await signIn()
              setBusy(false)
            }}
          >
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
        ) : (
          <Link to="/mixer" className="button-primary">
            Open local wardrobe
          </Link>
        )}
      </section>
    </main>
  )
}

export function AuthCallbackPage() {
  const { loading, session, error } = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const hash = new URLSearchParams(location.hash.slice(1))
  if (params.has('error') || hash.has('error'))
    return <Navigate to="/login?authError=1" replace />
  if (loading) return <p role="status">Finishing Google sign-in…</p>
  return (
    <Navigate
      to={session && !error ? '/mixer' : '/login?authError=1'}
      replace
    />
  )
}
