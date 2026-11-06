import { useEffect, useRef, useState } from 'react'
import {
  Grid2X2,
  Heart,
  Layers2,
  MonitorSmartphone,
  Settings2,
  Shirt,
  X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useWardrobe } from '../data/WardrobeContext'

const navigation = [
  { to: '/closet', label: 'Closet', icon: Grid2X2 },
  { to: '/mixer', label: 'Mixer', icon: Layers2 },
  { to: '/outfits', label: 'Outfits', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

const localNoticeKey = 'digital-closet:local-notice-dismissed'

function readDismissed() {
  try {
    return localStorage.getItem(localNoticeKey) === '1'
  } catch {
    return false
  }
}

export function AppShell() {
  const { mode } = useWardrobe()
  const { session } = useAuth()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const [noticeDismissed, setNoticeDismissed] = useState(readDismissed)
  const cloud = mode === 'cloud'
  const email = cloud ? session?.user.email : undefined
  const isMixer = pathname === '/mixer'
  useEffect(() => {
    const title =
      navigation.find((item) => item.to === pathname)?.label ??
      (pathname === '/login'
        ? 'Sign in'
        : pathname.startsWith('/closet/')
          ? 'Edit closet'
          : 'Digital Closet')
    document.title = `${title} · Digital Closet`
    mainRef.current?.focus()
    window.scrollTo?.(0, 0)
  }, [pathname])

  function dismissNotice() {
    setNoticeDismissed(true)
    try {
      localStorage.setItem(localNoticeKey, '1')
    } catch {
      // Storage unavailable: the notice stays hidden for this visit only.
    }
  }

  return (
    <div className={`app-shell${isMixer ? ' is-mixer' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <Link
            to="/mixer"
            className="wordmark"
            aria-label="Digital Closet home"
          >
            <span className="wordmark-mark" aria-hidden="true">
              <Shirt size={18} strokeWidth={1.75} />
            </span>
            <span>
              digital closet<span className="wordmark-dot">.</span>
            </span>
          </Link>
          <NavLink
            to="/settings"
            className="account-chip"
            aria-label={
              cloud
                ? `Settings, signed in${email ? ` as ${email}` : ''}`
                : 'Settings, wardrobe stored on this device'
            }
          >
            <span className="account-chip-label" aria-hidden="true">
              {cloud ? 'Synced' : 'This device'}
            </span>
            <span
              className={`account-avatar${cloud ? ' is-cloud' : ''}`}
              aria-hidden="true"
            >
              {email ? email[0].toUpperCase() : <MonitorSmartphone size={16} />}
            </span>
          </NavLink>
        </div>
      </header>
      {!cloud && !noticeDismissed && !isMixer && (
        <div className="local-notice" role="note">
          <p>
            Stored in this browser only. Clearing site data removes your pieces.
          </p>
          <button
            type="button"
            className="local-notice-close"
            aria-label="Dismiss storage notice"
            onClick={dismissNotice}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      <main id="main" ref={mainRef} tabIndex={-1} className="main-content">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'is-active' : ''}`
            }
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
