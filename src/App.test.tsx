import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './App'
import { initialWardrobe } from './data/wardrobe'

async function renderRoute(path: string) {
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes
        repository={{
          load: async () => initialWardrobe(),
          save: async () => {},
        }}
      />
    </MemoryRouter>,
  )
  await waitFor(() =>
    expect(
      screen.queryByText('Opening your local closet…'),
    ).not.toBeInTheDocument(),
  )
  await screen.findByRole('heading', { level: 1 })
  return result
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('Phase 1 local demo', () => {
  it('opens the vertical mixer at the root with its active navigation link', async () => {
    await renderRoute('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your closet. More possibilities.',
    )
    expect(
      within(screen.getByRole('navigation')).getByRole('link', {
        name: 'Mixer',
      }),
    ).toHaveAttribute('aria-current', 'page')
    const top = screen.getByRole('region', { name: 'Tops selector' })
    const bottom = screen.getByRole('region', { name: 'Bottoms selector' })
    expect(
      top.compareDocumentPosition(bottom) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('changes tops and bottoms independently and wraps both directions', async () => {
    await renderRoute('/mixer')
    const top = screen.getByRole('region', { name: 'Tops selector' })
    const bottom = screen.getByRole('region', { name: 'Bottoms selector' })
    fireEvent.click(screen.getByRole('button', { name: 'Next tops' }))
    expect(
      within(top).getByRole('heading', { name: 'Weekend tee' }),
    ).toBeInTheDocument()
    expect(
      within(bottom).getByRole('heading', { name: 'Straight-leg denim' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous bottoms' }))
    expect(
      within(bottom).getByRole('heading', { name: 'Everyday trousers' }),
    ).toBeInTheDocument()
    expect(
      within(top).getByRole('heading', { name: 'Weekend tee' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next bottoms' }))
    expect(
      within(bottom).getByRole('heading', { name: 'Straight-leg denim' }),
    ).toBeInTheDocument()
  })

  it('filters local fixtures and restores all pieces', async () => {
    await renderRoute('/closet?category=shoes')
    expect(screen.getByRole('status')).toHaveTextContent('1 piece')
    expect(
      screen.getByRole('heading', { name: 'Low-top sneakers' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Everyday tee' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All pieces' }))
    expect(screen.getByRole('status')).toHaveTextContent('9 pieces')
  })

  it('recovers from an unknown category', async () => {
    await renderRoute('/closet?category=unknown')
    fireEvent.click(screen.getByRole('button', { name: 'Show all pieces' }))
    expect(screen.getByRole('status')).toHaveTextContent('9 pieces')
  })

  it('navigates between demo routes', async () => {
    await renderRoute('/mixer')
    fireEvent.click(
      within(screen.getByRole('navigation')).getByRole('link', {
        name: 'Outfits',
      }),
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'A home for your favorite pairings',
    )
    fireEvent.click(screen.getByRole('link', { name: 'Open the mixer' }))
    expect(
      screen.getByRole('region', { name: 'Tops selector' }),
    ).toBeInTheDocument()
  })

  it('runs without configuration and explains unavailable sign-in', async () => {
    await renderRoute('/login')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "Sign-in isn't connected yet",
    )
    expect(
      screen.getByRole('link', { name: 'Explore the demo' }),
    ).toHaveAttribute('href', '/mixer')
  })

  it('does not expose sample or private wardrobe data for any share token', async () => {
    await renderRoute('/share/unvalidated-token')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "Sharing isn't available yet",
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('provides a recovery link for unknown routes', async () => {
    await renderRoute('/missing')
    expect(screen.getByRole('link', { name: 'Back to mixer' })).toHaveAttribute(
      'href',
      '/mixer',
    )
  })
})
