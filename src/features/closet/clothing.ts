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
  storagePath?: string
}
