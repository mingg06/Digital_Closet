import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, type AuthResult } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { configured, loading, session } = useAuth()
  if (loading) return <p role="status">Checking your session…</p>
  if (configured && !session) return <Navigate to="/login" replace />
  return children
}

type Mode = 'signin' | 'signup' | 'reset'

const copy: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  signin: {
    title: 'Welcome back',
    subtitle: 'Sign in to open your private wardrobe.',
    submit: 'Sign in',
  },
  signup: {
    title: 'Create your closet',
    subtitle: 'Start building outfits from the clothes you own.',
    submit: 'Create account',
  },
  reset: {
    title: 'Reset your password',
    subtitle: "Enter your email and we'll send you a reset link.",
    submit: 'Send reset link',
  },
}

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-card">{children}</section>
    </main>
  )
}

function Feedback({ result }: { result: AuthResult | null }) {
  if (!result) return null
  if (result.error)
    return (
      <p role="alert" className="auth-alert">
        {result.error}
      </p>
    )
  if (result.notice)
    return (
      <p role="status" className="auth-notice">
        {result.notice}
      </p>
    )
  return null
}

function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="auth-password">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder="Password"
        autoComplete={autoComplete}
        required
        minLength={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="auth-eye"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export function LoginPage() {
  const {
    configured,
    loading,
    session,
    error,
    signIn,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
  } = useAuth()
  const location = useLocation()
  const callbackFailed = new URLSearchParams(location.search).has('authError')
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)
  const [result, setResult] = useState<AuthResult | null>(null)

  if (loading) return <p role="status">Checking your session…</p>
  if (session) return <Navigate to="/mixer" replace />

  if (!configured)
    return (
      <AuthCard>
        <h1 className="auth-title">Sign-in isn't connected yet</h1>
        <p className="auth-subtitle">
          Add a valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to
          .env.local, then restart the development server.
        </p>
        <Link to="/mixer" className="auth-submit">
          Open local wardrobe
        </Link>
      </AuthCard>
    )

  function switchMode(next: Mode) {
    setMode(next)
    setResult(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy('email')
    setResult(null)
    const trimmed = email.trim()
    const outcome =
      mode === 'signin'
        ? await signInWithEmail(trimmed, password)
        : mode === 'signup'
          ? await signUpWithEmail(trimmed, password)
          : await sendPasswordReset(trimmed)
    setResult(outcome)
    if (outcome.notice && mode === 'signup') setMode('signin')
    setBusy(null)
  }

  const { title, subtitle, submit } = copy[mode]
  const oauthError =
    error ??
    (callbackFailed ? 'Sign-in did not finish. Please try again.' : null)

  return (
    <AuthCard>
      <p className="eyebrow">DIGITAL CLOSET</p>
      <h1 className="auth-title">{title}</h1>
      <p className="auth-subtitle">{subtitle}</p>

      {mode !== 'reset' && (
        <>
          <button
            type="button"
            className="auth-google"
            disabled={busy !== null}
            onClick={async () => {
              setBusy('google')
              await signIn()
              setBusy(null)
            }}
          >
            <GoogleLogo />
            {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <div className="auth-divider" role="separator">
            <span>or</span>
          </div>
        </>
      )}

      {oauthError && <Feedback result={{ error: oauthError }} />}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {mode !== 'reset' && (
          <div className="auth-field">
            <div className="auth-field-row">
              <label htmlFor="auth-password">Password</label>
              {mode === 'signin' && (
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => switchMode('reset')}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordField
              id="auth-password"
              value={password}
              onChange={setPassword}
              autoComplete={
                mode === 'signup' ? 'new-password' : 'current-password'
              }
            />
          </div>
        )}

        <Feedback result={result} />

        <button
          type="submit"
          className="auth-submit"
          disabled={busy !== null}
        >
          {busy === 'email' ? 'Please wait…' : submit}
        </button>
      </form>

      <p className="auth-switch">
        {mode === 'signin' ? (
          <>
            Don't have an account?{' '}
            <button
              type="button"
              className="auth-link"
              onClick={() => switchMode('signup')}
            >
              Create account
            </button>
          </>
        ) : (
          <>
            {mode === 'signup' ? 'Already have an account? ' : ''}
            <button
              type="button"
              className="auth-link"
              onClick={() => switchMode('signin')}
            >
              {mode === 'signup' ? 'Sign in' : 'Back to sign in'}
            </button>
          </>
        )}
      </p>

      <p className="auth-footnote">
        Your closet is private to your account. Only links you choose to share
        are visible to others.
      </p>
    </AuthCard>
  )
}

export function ResetPasswordPage() {
  const { loading, session, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)

  if (loading) return <p role="status">Checking your reset link…</p>
  if (!session)
    return (
      <AuthCard>
        <h1 className="auth-title">Reset link expired</h1>
        <p className="auth-subtitle">
          This link is no longer valid. Request a new one from the sign-in
          page.
        </p>
        <Link to="/login" className="auth-submit">
          Back to sign in
        </Link>
      </AuthCard>
    )

  return (
    <AuthCard>
      <h1 className="auth-title">Choose a new password</h1>
      <p className="auth-subtitle">Use at least 6 characters.</p>
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          const outcome = await updatePassword(password)
          setBusy(false)
          setResult(outcome)
          if (!outcome.error) navigate('/mixer', { replace: true })
        }}
      >
        <div className="auth-field">
          <label htmlFor="new-password">New password</label>
          <PasswordField
            id="new-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
        </div>
        <Feedback result={result} />
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AuthCard>
  )
}

export function AuthCallbackPage() {
  const { loading, session, error } = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const hash = new URLSearchParams(location.hash.slice(1))
  if (params.has('error') || hash.has('error'))
    return <Navigate to="/login?authError=1" replace />
  if (loading) return <p role="status">Finishing sign-in…</p>
  return (
    <Navigate
      to={session && !error ? '/mixer' : '/login?authError=1'}
      replace
    />
  )
}
