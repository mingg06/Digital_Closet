import { useEffect, useRef } from 'react'
import {
  ArrowUpRight,
  Grid2X2,
  Heart,
  Layers2,
  MessageCircle,
  Settings2,
  Shirt,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

const navigation = [
  { to: '/closet', label: 'Closet', icon: Grid2X2 },
  { to: '/mixer', label: 'Mixer', icon: Layers2 },
  { to: '/outfits', label: 'Outfits', icon: Heart },
  { to: '/suggestions', label: 'Suggestions', icon: MessageCircle },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export function AppShell() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const title =
      navigation.find((item) => item.to === pathname)?.label ??
      (pathname === '/login' ? 'Sign in' : 'Digital Closet')
    document.title = `${title} · Digital Closet`
    mainRef.current?.focus()
    window.scrollTo?.(0, 0)
  }, [pathname])

  return (
    <div className="app-shell">
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
        <Link to="/settings" className="demo-label">
          Local demo <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </header>
      <div className="demo-banner">
        Your wardrobe, stored in this browser.{' '}
        <span>
          No account or cloud sync · clearing site data removes saved pieces.
        </span>
      </div>
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
