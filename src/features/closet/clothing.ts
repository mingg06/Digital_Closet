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
  isShareable?: boolean
}

export type PhotoMime = 'image/jpeg' | 'image/webp' | 'image/png'

/** Matches a saved photo data URL in any supported format. */
export const photoDataUrl =
  /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/

export const photoExtensions: Record<PhotoMime, string> = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/png': 'png',
}

export function dataUrlMime(value: string): PhotoMime | undefined {
  return value.match(/^data:(image\/(?:jpeg|webp|png));base64,/)?.[1] as
    PhotoMime | undefined
}

/** Cutouts are saved as transparent WebP/PNG; legacy photos are grey JPEGs. */
export function isCutout(item?: Pick<ClothingItem, 'image' | 'storagePath'>) {
  if (!item) return false
  const mime = dataUrlMime(item.image)
  if (mime) return mime !== 'image/jpeg'
  return /\.(webp|png)$/.test(item.storagePath ?? '')
}
