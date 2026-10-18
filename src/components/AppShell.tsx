import { useEffect, useRef } from 'react'
import {
  ArrowUpRight,
  Grid2X2,
  Heart,
  Layers2,
  Settings2,
  Shirt,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useWardrobe } from '../data/WardrobeContext'

const navigation = [
  { to: '/closet', label: 'Closet', icon: Grid2X2 },
  { to: '/mixer', label: 'Mixer', icon: Layers2 },
  { to: '/outfits', label: 'Outfits', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export function AppShell() {
  const { mode } = useWardrobe()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
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

  return (
    <div className={`app-shell${pathname === '/mixer' ? ' is-mixer' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/mixer" className="wordmark" aria-label="Digital Closet home">
          <Shirt size={24} aria-hidden="true" />
          <span>
            digital closet<span className="wordmark-dot">.</span>
          </span>
        </Link>
        <span className="text-xs tracking-widest uppercase text-muted hidden sm:block">
          Less wondering. More wearing.
        </span>
        <Link to="/settings" className="storage-label">
          {mode === 'cloud' ? 'Your account' : 'On this device'}{' '}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </header>
      {pathname !== '/mixer' && (
        <div className="storage-banner">
          {mode === 'cloud' ? (
            <>
              Your private cloud wardrobe.{' '}
              <span>
                Photos and saved outfits belong to your signed-in account.
              </span>
            </>
          ) : (
            <>
              Your wardrobe, stored in this browser.{' '}
              <span>
                No cloud sync · clearing site data removes saved pieces.
              </span>
            </>
          )}
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
