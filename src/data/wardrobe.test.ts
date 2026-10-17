import { fixtureWardrobe } from '../test/fixtures'
import { describe, expect, it } from 'vitest'
import { addOutfit, removeItem, upsertItem } from './wardrobe'

const outfit = {
  id: 'outfit-1',
  name: 'Weekend',
  topItemId: 'top-sage',
  bottomItemId: 'bottom-sand',
  createdAt: '2026-10-16T00:00:00.000Z',
}

describe('local wardrobe integrity', () => {
  it('keeps stable item references when saving, reordering, and editing', () => {
    const initial = fixtureWardrobe()
    const saved = addOutfit(initial, outfit)
    const edited = upsertItem(saved, { ...saved.items[1], name: 'Renamed tee' })
    expect(edited.outfits[0]).toEqual(outfit)
    expect(
      edited.items.find((item) => item.id === outfit.topItemId)?.name,
    ).toBe('Renamed tee')
    expect(initial.outfits).toHaveLength(0)
    expect(initial.items[1].name).toBe('Weekend tee')
  })
  it('removes only outfits referencing a deleted item', () => {
    const saved = addOutfit(addOutfit(fixtureWardrobe(), outfit), {
      ...outfit,
      id: 'other',
      topItemId: 'top-cream',
    })
    const result = removeItem(saved, 'top-sage')
    expect(result.items.some((item) => item.id === 'top-sage')).toBe(false)
    expect(result.outfits.map((entry) => entry.id)).toEqual(['other'])
  })
  it('prevents category edits that invalidate existing combinations', () => {
    const saved = addOutfit(fixtureWardrobe(), outfit)
    expect(() =>
      upsertItem(saved, { ...saved.items[1], category: 'shoes' }),
    ).toThrow('Remove outfits')
  })
  it('rejects missing or wrong-category references', () => {
    expect(() =>
      addOutfit(fixtureWardrobe(), { ...outfit, topItemId: 'unknown' }),
    ).toThrow('Choose an available')
    expect(() =>
      addOutfit(fixtureWardrobe(), { ...outfit, bottomItemId: 'shoe-white' }),
    ).toThrow('Choose an available')
  })
  it('requires explicit category and a nonblank name for pieces', () => {
    const value = fixtureWardrobe()
    expect(() => upsertItem(value, { ...value.items[0], name: '   ' })).toThrow(
      'name',
    )
    expect(() =>
      upsertItem(value, { ...value.items[0], category: '' as never }),
    ).toThrow('category')
  })
  it('validates and normalizes optional tags', () => {
    const value = fixtureWardrobe()
    expect(
      upsertItem(value, {
        ...value.items[0],
        tags: ['weekend', 'weekend', ' casual '],
      }).items[0].tags,
    ).toEqual(['weekend', 'casual'])
    expect(() =>
      upsertItem(value, { ...value.items[0], tags: ['x'.repeat(31)] }),
    ).toThrow('tags')
  })
})
