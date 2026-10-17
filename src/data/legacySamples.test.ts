import { describe, expect, it } from 'vitest'
import { initialWardrobe } from './wardrobe'
import { removeLegacySamples } from './legacySamples'
import { fixtureWardrobe } from '../test/fixtures'

describe('empty wardrobes and legacy sample cleanup', () => {
  it('starts with no clothes or saved outfits', () => {
    expect(initialWardrobe()).toEqual({
      version: 1,
      revision: 0,
      items: [],
      outfits: [],
    })
  })

  it('removes bundled samples and dependent outfits while keeping real photos and combinations', () => {
    const original = fixtureWardrobe()
    original.items[0].image = '/samples/cream-tee.svg'
    original.outfits = [
      {
        id: 'sample-outfit',
        name: 'Sample',
        topItemId: 'top-cream',
        bottomItemId: 'bottom-denim',
        createdAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'real-outfit',
        name: 'Real',
        topItemId: 'top-sage',
        bottomItemId: 'bottom-denim',
        createdAt: '2026-10-16T00:00:00Z',
      },
    ]
    const cleaned = removeLegacySamples(original)
    expect(cleaned.revision).toBe(1)
    expect(cleaned.items.map((item) => item.id)).not.toContain('top-cream')
    expect(cleaned.items.some((item) => item.id === 'top-sage')).toBe(true)
    expect(cleaned.outfits.map((outfit) => outfit.id)).toEqual(['real-outfit'])
    expect(original.items).toHaveLength(9)
    expect(original.outfits).toHaveLength(2)
    expect(removeLegacySamples(cleaned)).toBe(cleaned)
  })

  it('keeps real photos even when marked as samples by an earlier build', () => {
    const original = fixtureWardrobe()
    Object.assign(original.items[0], { isSample: true })
    expect(removeLegacySamples(original)).toBe(original)
  })
})
