import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ClosetPage } from './features/closet/ClosetPage'
import { MixerPage } from './features/mixer/MixerPage'
import { EmptyState } from './components/EmptyState'
import { SettingsPage, SharePage } from './pages/SetupPages'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage, AuthCallbackPage, RequireAuth } from './auth/AuthPages'
import { WardrobeProvider } from './data/WardrobeProvider'
import type { WardrobeRepository } from './data/wardrobe'
import { ItemForm } from './features/closet/ItemForm'
import { OutfitsPage } from './features/outfits/OutfitsPage'
import { ErrorBoundary } from './components/ErrorBoundary'

export function AppRoutes({ repository }: { repository?: WardrobeRepository }) {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <WardrobeProvider repository={repository}>
                <AppShell />
              </WardrobeProvider>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/mixer" replace />} />
          <Route path="closet" element={<ClosetPage />} />
          <Route path="closet/new" element={<ItemForm key="new" />} />
          <Route path="closet/:id/edit" element={<ItemForm />} />
          <Route path="mixer" element={<MixerPage />} />
          <Route path="outfits" element={<OutfitsPage />} />
          <Route
            path="suggestions"
            element={
              <EmptyState
                eyebrow="A FRESH PERSPECTIVE"
                title="Good style is better together"
                description="Friend suggestions will appear here once private sharing is available. There are no suggestions in this demo."
                action="Explore your closet"
                to="/closet"
              />
            }
          />
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
