import { Link } from 'react-router-dom'
import { ArrowRight, LockKeyhole } from 'lucide-react'

export function SettingsPage() {
  return (
    <section className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">MAKE IT YOURS</p>
        <h1>Your closet, your space.</h1>
        <p className="text-muted">
          You're exploring a local demo with bundled sample illustrations.
        </p>
      </div>
      <div className="notice">
        <h2>Personal wardrobe coming soon</h2>
        <p>
          Sign-in, photo storage, and private share links aren't connected yet.
          No account is required for this demo, and no changes are saved.
        </p>
        <Link to="/login" className="text-link mt-4">
          About sign-in <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="notice mt-4">
        <h2>Private sharing</h2>
        <p>
          Sharing will be available after secure access is connected. This demo
          cannot generate or validate share links.
        </p>
      </div>
    </section>
  )
}

export function LoginPage() {
  return (
    <section className="empty-state">
      <LockKeyhole size={36} strokeWidth={1.25} aria-hidden="true" />
      <p className="eyebrow">YOUR PERSONAL WARDROBE</p>
      <h1>Sign-in isn't connected yet</h1>
      <p className="text-muted max-w-md">
        You can explore the sample wardrobe without an account. Google sign-in
        and secure storage will arrive in a later phase.
      </p>
      <Link to="/mixer" className="button-primary">
        Explore the demo <ArrowRight size={18} aria-hidden="true" />
      </Link>
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
          Explore the sample demo <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </main>
  )
}
