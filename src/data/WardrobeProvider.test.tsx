import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../App'
import { fixtureWardrobe } from '../test/fixtures'
import type { WardrobeRepository } from './wardrobe'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

function open(path: string, repository: WardrobeRepository) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes repository={repository} />
    </MemoryRouter>,
  )
}

describe('local wardrobe flows', () => {
  it('keeps loading visible until storage resolves', async () => {
    let resolve: (value: ReturnType<typeof fixtureWardrobe>) => void = () => {}
    open('/closet', {
      load: () =>
        new Promise((done) => {
          resolve = done
        }),
      save: async () => {},
    })
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    resolve(fixtureWardrobe())
    expect(
      await screen.findByRole('heading', { name: 'Everyday tee' }),
    ).toBeInTheDocument()
  })

  it('retries a storage read failure without replacing existing records', async () => {
    const save = vi.fn()
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('Browser storage is unavailable.'))
      .mockResolvedValue(fixtureWardrobe())
    open('/closet', { load, save })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Browser storage is unavailable',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('heading', { name: 'Everyday tee' }),
    ).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('preserves form input and existing data when a save fails, then allows retry', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Storage is full. Free space and try again.'),
      )
      .mockResolvedValue(undefined)
    const original = fixtureWardrobe()
    open('/closet/top-cream/edit', { load: async () => original, save })
    const name = await screen.findByLabelText('Name (required)')
    fireEvent.change(name, { target: { value: 'Edited tee' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save piece' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Storage is full',
    )
    expect(name).toHaveValue('Edited tee')
    expect(original.items[0].name).toBe('Everyday tee')
    expect(screen.getByRole('button', { name: 'Save piece' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Save piece' }))
    expect(
      await screen.findByRole('heading', { name: 'Edited tee' }),
    ).toBeInTheDocument()
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('saves the selected IDs and shows their exact pieces in the outfits gallery', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    open('/mixer', { load: async () => fixtureWardrobe(), save })
    await screen.findByRole('heading', { name: 'Everyday tee' })
    fireEvent.click(screen.getByRole('button', { name: 'Next tops' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous bottoms' }))
    fireEvent.change(screen.getByLabelText('Name this outfit'), {
      target: { value: 'My combination' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save outfit' }))
    fireEvent.click(
      await screen.findByRole('link', { name: 'View saved outfits' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'My combination' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Weekend tee + Everyday trousers'),
    ).toBeInTheDocument()
    expect(save.mock.calls[0][0].outfits[0]).toMatchObject({
      topItemId: 'top-sage',
      bottomItemId: 'bottom-charcoal',
    })
  })

  it('disables outfit saving when pieces are unavailable', async () => {
    open('/mixer', {
      load: async () => ({ ...fixtureWardrobe(), items: [] }),
      save: async () => {},
    })
    expect(
      await screen.findByText('No tops in this closet yet.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No bottoms in this closet yet.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save outfit' })).toBeDisabled()
  })

  it('paginates the closet and resets to the first page when filtering', async () => {
    const wardrobe = fixtureWardrobe()
    wardrobe.items = Array.from({ length: 25 }, (_, index) => ({
      ...wardrobe.items[0],
      id: `piece-${index}`,
      name: `Piece ${index}`,
    }))
    open('/closet', { load: async () => wardrobe, save: async () => {} })
    await screen.findByRole('heading', { name: 'Piece 0' })
    expect(
      screen.queryByRole('heading', { name: 'Piece 24' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(
      screen.getByRole('heading', { name: 'Piece 24' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Piece 0' }),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search pieces'), {
      target: { value: 'Piece 0' },
    })
    expect(screen.getByRole('heading', { name: 'Piece 0' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Next page' }),
    ).not.toBeInTheDocument()
  })

  it('searches optional tags and subcategories', async () => {
    const wardrobe = fixtureWardrobe()
    wardrobe.items[0] = {
      ...wardrobe.items[0],
      tags: ['summer'],
      subcategory: 'linen shirt',
    }
    open('/closet', { load: async () => wardrobe, save: async () => {} })
    const search = await screen.findByLabelText('Search pieces')
    fireEvent.change(search, { target: { value: 'SUMMER' } })
    await waitFor(() =>
      expect(
        within(screen.getByRole('list')).getAllByRole('listitem'),
      ).toHaveLength(1),
    )
    fireEvent.change(search, { target: { value: 'linen' } })
    expect(
      screen.getByRole('heading', { name: 'Everyday tee' }),
    ).toBeInTheDocument()
  })
})
