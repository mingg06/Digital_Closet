import { useEffect, useState, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { AuthContext } from './AuthContext'
import { supabase } from './supabase'

export function AuthProvider({
  children,
  client = supabase,
}: {
  children: ReactNode
  client?: SupabaseClient | null
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(client))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return
    let active = true
    let receivedEvent = false
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      receivedEvent = true
      setSession(next)
      setLoading(false)
    })
    // The SDK finishes URL detection and the PKCE exchange before getSession resolves.
    void client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return
        if (!receivedEvent) setSession(data.session)
        if (sessionError)
          setError('Could not restore your session. Please sign in again.')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError(
          'Could not connect to sign-in. Check your connection and try again.',
        )
        setLoading(false)
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  async function signIn() {
    if (!client) return
    setError(null)
    try {
      const { error: signInError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (signInError) throw signInError
    } catch {
      setError(
        'Could not start Google sign-in. Check your connection and provider configuration, then retry.',
      )
    }
  }

  async function signOut() {
    if (!client) return
    setError(null)
    try {
      const { error: signOutError } = await client.auth.signOut({
        scope: 'local',
      })
      if (signOutError) throw signOutError
      setSession(null)
    } catch {
      setError('Could not sign out. Check your connection and try again.')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        configured: Boolean(client),
        loading,
        session,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
