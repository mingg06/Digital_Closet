import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

/** Outcome of an email auth action: an error to show, or a notice (e.g. "check your inbox"). */
export interface AuthResult {
  error?: string
  notice?: string
}

export interface AuthState {
  configured: boolean
  loading: boolean
  session: Session | null
  error: string | null
  signIn: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>
  sendPasswordReset: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('Auth provider is missing.')
  return auth
}
