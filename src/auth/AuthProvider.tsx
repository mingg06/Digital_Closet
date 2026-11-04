import { useEffect, useState, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { AuthContext, type AuthResult } from './AuthContext'
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

  const notConnected: AuthResult = { error: 'Sign-in is not connected yet.' }

  async function signInWithEmail(
    email: string,
    password: string,
  ): Promise<AuthResult> {
    if (!client) return notConnected
    setError(null)
    try {
      const { error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        if (authError.message.toLowerCase().includes('email not confirmed'))
          return { error: 'Confirm your email first — check your inbox.' }
        return { error: 'Incorrect email or password.' }
      }
      return {}
    } catch {
      return { error: 'Could not reach sign-in. Check your connection.' }
    }
  }

  async function signUpWithEmail(
    email: string,
    password: string,
  ): Promise<AuthResult> {
    if (!client) return notConnected
    setError(null)
    try {
      const { data, error: authError } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) return { error: authError.message }
      if (!data.session)
        return { notice: 'Check your inbox to confirm your email, then sign in.' }
      return {}
    } catch {
      return { error: 'Could not create your account. Check your connection.' }
    }
  }

  async function sendPasswordReset(email: string): Promise<AuthResult> {
    if (!client) return notConnected
    try {
      const { error: authError } = await client.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/reset-password` },
      )
      if (authError) return { error: authError.message }
      return { notice: 'If that email has an account, a reset link is on its way.' }
    } catch {
      return { error: 'Could not send the reset email. Check your connection.' }
    }
  }

  async function updatePassword(password: string): Promise<AuthResult> {
    if (!client) return notConnected
    try {
      const { error: authError } = await client.auth.updateUser({ password })
      if (authError) return { error: authError.message }
      return { notice: 'Password updated.' }
    } catch {
      return { error: 'Could not update your password. Check your connection.' }
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
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
