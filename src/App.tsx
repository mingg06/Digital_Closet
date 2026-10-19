import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ClosetPage } from './features/closet/ClosetPage'
import { MixerPage } from './features/mixer/MixerPage'
import { EmptyState } from './components/EmptyState'
import { SettingsPage } from './pages/SetupPages'
import { SharePage } from './features/sharing/SharePage'
import { SuggestionsPage } from './features/sharing/SuggestionsPage'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage, AuthCallbackPage, RequireAuth } from './auth/AuthPages'
import { WardrobeProvider } from './data/WardrobeProvider'
import type { WardrobeRepository } from './data/wardrobe'
import { ItemForm } from './features/closet/ItemForm'
import { OutfitsPage } from './features/outfits/OutfitsPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useMemo, type ReactNode } from 'react'
import { useAuth } from './auth/AuthContext'
import { supabase } from './auth/supabase'
import { createCloudRepository } from './data/cloudWardrobe'

function ConnectedWardrobe({
  repository,
  children,
}: {
  repository?: WardrobeRepository
  children: ReactNode
}) {
  const { session } = useAuth()
  const ownerId = session?.user.id
  const selected = useMemo(
    () =>
      repository ??
      (supabase && ownerId
        ? createCloudRepository(supabase, ownerId)
        : undefined),
    [repository, ownerId],
  )
  return (
    <WardrobeProvider key={ownerId ?? 'local'} repository={selected}>
      {children}
    </WardrobeProvider>
  )
}

export function AppRoutes({ repository }: { repository?: WardrobeRepository }) {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <ConnectedWardrobe repository={repository}>
                <AppShell />
              </ConnectedWardrobe>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/mixer" replace />} />
          <Route path="closet" element={<ClosetPage />} />
          <Route path="closet/new" element={<ItemForm key="new" />} />
          <Route path="closet/:id/edit" element={<ItemForm />} />
          <Route path="mixer" element={<MixerPage />} />
          <Route path="outfits" element={<OutfitsPage />} />
          <Route path="suggestions" element={<SuggestionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="*"
            element={
              <EmptyState
                eyebrow="PAGE NOT FOUND"
                title="This one's not in the closet"
                description="That address doesn't match a page. Head back to your outfit mixer."
                action="Back to mixer"
                to="/mixer"
              />
            }
          />
        </Route>
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
