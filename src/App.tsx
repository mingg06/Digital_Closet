import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ClosetPage } from './features/closet/ClosetPage'
import { MixerPage } from './features/mixer/MixerPage'
import { EmptyState } from './components/EmptyState'
import { LoginPage, SettingsPage, SharePage } from './pages/SetupPages'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/mixer" replace />} />
        <Route path="closet" element={<ClosetPage />} />
        <Route path="mixer" element={<MixerPage />} />
        <Route
          path="outfits"
          element={
            <EmptyState
              eyebrow="YOUR COMBINATIONS"
              title="A home for your favorite pairings"
              description="Saved outfits will live here. For now, explore combinations with the sample wardrobe."
              action="Open the mixer"
              to="/mixer"
            />
          }
        />
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
        <Route path="login" element={<LoginPage />} />
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
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
