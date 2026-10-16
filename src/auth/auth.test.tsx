import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './AuthContext'
import { AuthCallbackPage, LoginPage, RequireAuth } from './AuthPages'
import { createBrowserClient } from './supabase'

const session = { user: { id: 'owner', email: 'owner@example.com' } } as Session

function mockClient(initial: Session | null = null) {
  const listeners = new Set<(event: string, session: Session | null) => void>()
  const auth = {
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: initial }, error: null }),
    onAuthStateChange: vi.fn(
      (listener: (event: string, session: Session | null) => void) => {
        listeners.add(listener)
        return {
          data: {
            subscription: { unsubscribe: () => listeners.delete(listener) },
          },
        }
      },
    ),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }
  return { client: { auth } as unknown as SupabaseClient, auth, listeners }
}

function Account() {
  const { session, signOut, error } = useAuth()
  return (
    <>
      <p>{session?.user.email}</p>
      <button onClick={() => void signOut()}>Sign out</button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}

function mount(client: SupabaseClient | null, path = '/login') {
  return render(
    <StrictMode>
      <AuthProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/mixer"
              element={
                <RequireAuth>
                  <Account />
                </RequireAuth>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </StrictMode>,
  )
}

describe('Supabase authentication', () => {
  it('handles missing or invalid configuration without constructing a client', () => {
    expect(createBrowserClient('', '')).toBeNull()
    expect(createBrowserClient('invalid-url', 'key')).toBeNull()
    mount(null)
    expect(
      screen.getByText(/Add a valid VITE_SUPABASE_URL/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('redirects signed-out visitors from protected routes to login', async () => {
    const { client } = mockClient()
    mount(client, '/mixer')
    expect(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('owner@example.com')).not.toBeInTheDocument()
  })

  it('starts Google OAuth with the exact local callback', async () => {
    const { client, auth } = mockClient()
    mount(client)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    )
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  })

  it('shows a retryable error when starting OAuth fails', async () => {
    const { client, auth } = mockClient()
    auth.signInWithOAuth.mockRejectedValue(new Error('network'))
    mount(client)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not start Google sign-in',
    )
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled()
  })

  it('restores a session through the callback and signs out locally', async () => {
    const { client, auth, listeners } = mockClient(session)
    const view = mount(client, '/auth/callback?code=example')
    expect(await screen.findByText('owner@example.com')).toBeInTheDocument()
    expect(listeners.size).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    ).toBeInTheDocument()
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    view.unmount()
    expect(listeners.size).toBe(0)
  })

  it('handles a denied Google callback without rendering wardrobe data', async () => {
    const { client } = mockClient()
    mount(client, '/auth/callback?error=access_denied')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google sign-in did not finish',
    )
  })

  it('keeps the session and reports failed sign-out', async () => {
    const { client, auth } = mockClient(session)
    auth.signOut.mockResolvedValue({ error: new Error('offline') })
    mount(client, '/mixer')
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not sign out',
    )
    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
  })

  it('recovers from a rejected session lookup', async () => {
    const { client, auth } = mockClient()
    auth.getSession.mockRejectedValue(new Error('offline'))
    mount(client, '/mixer')
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Could not connect'),
    )
  })
})
