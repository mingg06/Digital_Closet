import type { ClothingItem } from '../features/closet/clothing'
import type { Wardrobe } from '../data/wardrobe'

// Synthetic records for automated tests only; never imported by the application.
const fixtureItems: ClothingItem[] = [
  {
    id: 'top-cream',
    name: 'Everyday tee',
    category: 'tops',
    color: 'Cream',
    image: 'data:image/jpeg;base64,/9j/2Q==',
  },
  {
    id: 'top-sage',
    name: 'Weekend tee',
    category: 'tops',
    color: 'Sage',
    image: 'data:image/jpeg;base64,/9j/2Q==',
  },
  {
    id: 'top-ink',
    name: 'Essential tee',
    category: 'tops',
    color: 'Ink',
    image: 'data:image/jpeg;base64,/9j/2Q==',
  },
  {
    id: 'bottom-denim',
    name: 'Straight-leg denim',
    category: 'bottoms',
    color: 'Indigo',
    image: 'data:image/jpeg;base64,/9j/2Q==',
  },
  {
    id: 'bottom-sand',
    name: 'Relaxed trousers',
    category: 'bottoms',
    color: 'Sand',
    image: 'data:image/jpeg;base64,/9j/2Q==',
  },
  {
    id: 'bottom-charcoal',
    name: 'Everyday trousers',
    category: 'bottoms',
    color: 'Charcoal',
    image: 'data:image/jpeg;base64,/9j/2Q==',
  },
  {
    id: 'outer-olive',
    name: 'Chore jacket',
    category: 'outerwear',
    color: 'Olive',
    image: 'data:image/jpeg;base64,/9j/2Q==',
  },
  {
    id: 'shoe-white',
    name: 'Low-top sneakers',
    category: 'shoes',
    color: 'White',
    image: 'data:image/jpeg;base64,/9j/2Q==',
  },
  {
    id: 'accessory-tote',
    name: 'Market tote',
    category: 'accessories',
    color: 'Canvas',
    image: 'data:image/jpeg;base64,/9j/2Q==',
  },
]

export function fixtureWardrobe(): Wardrobe {
  return {
    version: 1,
    revision: 0,
    items: fixtureItems.map((item) => ({
      ...item,
      tags: [],
      createdAt: '2026-10-16T00:00:00.000Z',
    })),
    outfits: [],
  }
}
