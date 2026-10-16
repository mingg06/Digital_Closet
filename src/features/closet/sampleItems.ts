export const categories = [
  'tops',
  'bottoms',
  'shoes',
  'outerwear',
  'accessories',
] as const
export type Category = (typeof categories)[number]

export interface ClothingItem {
  id: string
  name: string
  category: Category
  color: string
  image: string
  subcategory?: string
  tags?: string[]
  createdAt?: string
  isSample?: boolean
}

// Public, bundled demo fixtures only. These are never owner or guest records.
export const sampleItems: ClothingItem[] = [
  {
    id: 'top-cream',
    name: 'Everyday tee',
    category: 'tops',
    color: 'Cream',
    image: '/samples/cream-tee.svg',
  },
  {
    id: 'top-sage',
    name: 'Weekend tee',
    category: 'tops',
    color: 'Sage',
    image: '/samples/sage-tee.svg',
  },
  {
    id: 'top-ink',
    name: 'Essential tee',
    category: 'tops',
    color: 'Ink',
    image: '/samples/ink-tee.svg',
  },
  {
    id: 'bottom-denim',
    name: 'Straight-leg denim',
    category: 'bottoms',
    color: 'Indigo',
    image: '/samples/denim.svg',
  },
  {
    id: 'bottom-sand',
    name: 'Relaxed trousers',
    category: 'bottoms',
    color: 'Sand',
    image: '/samples/trousers.svg',
  },
  {
    id: 'bottom-charcoal',
    name: 'Everyday trousers',
    category: 'bottoms',
    color: 'Charcoal',
    image: '/samples/charcoal.svg',
  },
  {
    id: 'outer-olive',
    name: 'Chore jacket',
    category: 'outerwear',
    color: 'Olive',
    image: '/samples/jacket.svg',
  },
  {
    id: 'shoe-white',
    name: 'Low-top sneakers',
    category: 'shoes',
    color: 'White',
    image: '/samples/sneakers.svg',
  },
  {
    id: 'accessory-tote',
    name: 'Market tote',
    category: 'accessories',
    color: 'Canvas',
    image: '/samples/tote.svg',
  },
]
