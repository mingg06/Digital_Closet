import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { AuthContext } from '../../auth/AuthContext'
import { WardrobeContext } from '../../data/WardrobeContext'
import { fixtureWardrobe } from '../../test/fixtures'
import { SharingSettings } from './SharingSettings'
import { SuggestionsPage } from './SuggestionsPage'
import { activeShare, shareRequest, readSuggestions } from './api'

vi.mock('./api', () => ({
  activeShare: vi.fn(),
  shareRequest: vi.fn(),
  readSuggestions: vi.fn(),
  deleteSuggestion: vi.fn(),
}))

function mount(children: ReactNode) {
  const wardrobe = fixtureWardrobe()
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          session: { user: { id: 'owner' } } as Session,
          configured: true,
          loading: false,
          error: null,
          signIn: async () => {},
          signOut: async () => {},
        }}
      >
        <WardrobeContext.Provider
          value={{
            wardrobe,
            mode: 'cloud',
            busy: false,
            update: async () => {},
            refreshPhotos: async () => {},
          }}
        >
          {children}
        </WardrobeContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(activeShare).mockResolvedValue(null)
  vi.mocked(readSuggestions).mockResolvedValue([])
  vi.mocked(shareRequest).mockReset()
})

describe('owner sharing workflows', () => {
  it('creates a one-time visible link and explains forwarding and expiry', async () => {
    vi.mocked(shareRequest).mockResolvedValue({
      id: 'link',
      token: 'a'.repeat(64),
      scope: 'all',
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    })
    mount(<SharingSettings />)
    const create = await screen.findByRole('button', {
      name: 'Create share link',
    })
    await waitFor(() => expect(create).toBeEnabled())
    fireEvent.click(create)
    expect(await screen.findByLabelText('Your private share link')).toHaveValue(
      `${window.location.origin}/share/${'a'.repeat(64)}`,
    )
    expect(shareRequest).toHaveBeenCalledWith({ action: 'create' })
    expect(
      screen.getByText(/including clothes you add later/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText(/recipients may forward/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Revoke link' }),
    ).toBeInTheDocument()
  })

  it('does not reconstruct the raw token from an existing link record', async () => {
    vi.mocked(activeShare).mockResolvedValue({
      id: 'existing',
      share_scope: 'all',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
    })
    mount(<SharingSettings />)
    await screen.findByRole('button', { name: 'Replace link' })
    expect(
      screen.queryByLabelText('Your private share link'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/full link is shown only when created/),
    ).toBeInTheDocument()
  })

  it('explains that an older selected-piece link needs replacement', async () => {
    vi.mocked(activeShare).mockResolvedValue({
      id: 'older',
      share_scope: 'selected',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
    })
    mount(<SharingSettings />)
    expect(
      await screen.findByText(/older link shares selected pieces/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace link' })).toBeEnabled()
  })

  it('blocks creation when the whole-closet migration is not available', async () => {
    vi.mocked(activeShare).mockRejectedValue(
      new Error('Apply the whole-closet sharing migration.'),
    )
    mount(<SharingSettings />)
    await screen.findByRole('alert')
    expect(
      screen.getByRole('button', { name: 'Create share link' }),
    ).toBeDisabled()
    expect(shareRequest).not.toHaveBeenCalled()
  })

  it('surfaces a failed link creation without pretending it succeeded', async () => {
    vi.mocked(shareRequest).mockRejectedValue(
      new Error('Function is not deployed yet.'),
    )
    mount(<SharingSettings />)
    const create = await screen.findByRole('button', {
      name: 'Create share link',
    })
    await waitFor(() => expect(create).toBeEnabled())
    fireEvent.click(create)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Function is not deployed yet.',
    )
    expect(
      screen.queryByLabelText('Your private share link'),
    ).not.toBeInTheDocument()
  })

  it('loads suggestions for the signed-in owner and reopens the exact pair', async () => {
    vi.mocked(readSuggestions).mockResolvedValue([
      {
        id: 'suggestion',
        top_item_id: 'top-sage',
        bottom_item_id: 'bottom-denim',
        nickname: '<script>friend</script>',
        message: '<img src=x onerror=alert(1)>',
        created_at: new Date().toISOString(),
      },
    ])
    mount(<SuggestionsPage />)
    const link = await screen.findByRole('link', { name: 'Try this outfit' })
    expect(link).toHaveAttribute(
      'href',
      '/mixer?top=top-sage&bottom=bottom-denim&topCategory=tops',
    )
    expect(readSuggestions).toHaveBeenCalledWith('owner', 0)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })
})
