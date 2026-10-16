import { categories, sampleItems } from '../features/closet/sampleItems'
import type { ClothingItem } from '../features/closet/sampleItems'

export interface Outfit {
  id: string
  name: string
  topItemId: string
  bottomItemId: string
  createdAt: string
}

export interface Wardrobe {
  version: 1
  revision: number
  items: ClothingItem[]
  outfits: Outfit[]
}

export function initialWardrobe(): Wardrobe {
  return {
    version: 1,
    revision: 0,
    items: sampleItems.map((item) => ({
      ...item,
      isSample: true,
      createdAt: '2026-10-16T00:00:00.000Z',
      tags: [],
    })),
    outfits: [],
  }
}

export function validateItem(item: ClothingItem): ClothingItem {
  if (!item.id || !item.name.trim() || item.name.trim().length > 80)
    throw new Error('Give this piece a name of 1–80 characters.')
  if (!categories.includes(item.category))
    throw new Error('Choose a clothing category.')
  if (item.color.length > 40 || (item.subcategory?.length ?? 0) > 40)
    throw new Error('Keep color and subcategory to 40 characters each.')
  if (
    (item.tags?.length ?? 0) > 10 ||
    item.tags?.some((tag) => !tag.trim() || tag.length > 30)
  )
    throw new Error('Use up to 10 tags, each 1–30 characters.')
  if (
    !item.image ||
    item.image.length > 2_000_000 ||
    !(
      /^\/samples\/[\w-]+\.svg$/.test(item.image) ||
      /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(item.image)
    )
  )
    throw new Error('Choose a supported photo and try again.')
  return {
    ...item,
    name: item.name.trim(),
    color: item.color.trim(),
    subcategory: item.subcategory?.trim(),
    tags: [...new Set(item.tags?.map((tag) => tag.trim()) ?? [])],
  }
}

export function upsertItem(wardrobe: Wardrobe, item: ClothingItem): Wardrobe {
  const validated = validateItem(item)
  if (
    !wardrobe.items.some((entry) => entry.id === item.id) &&
    wardrobe.items.length >= 500
  )
    throw new Error(
      'This local closet holds up to 500 pieces. Remove a piece before adding another.',
    )
  // Category edits must not invalidate saved top/bottom references.
  const referenced = wardrobe.outfits.some(
    (outfit) => outfit.topItemId === item.id || outfit.bottomItemId === item.id,
  )
  if (
    referenced &&
    wardrobe.items.find((entry) => entry.id === item.id)?.category !==
      item.category
  )
    throw new Error(
      'Remove outfits using this piece before changing its category.',
    )
  return {
    ...wardrobe,
    items: wardrobe.items.some((entry) => entry.id === item.id)
      ? wardrobe.items.map((entry) =>
          entry.id === item.id ? validated : entry,
        )
      : [validated, ...wardrobe.items],
  }
}

export function removeItem(wardrobe: Wardrobe, id: string): Wardrobe {
  return {
    ...wardrobe,
    items: wardrobe.items.filter((item) => item.id !== id),
    outfits: wardrobe.outfits.filter(
      (outfit) => outfit.topItemId !== id && outfit.bottomItemId !== id,
    ),
  }
}

export function addOutfit(wardrobe: Wardrobe, outfit: Outfit): Wardrobe {
  if (!outfit.name.trim() || outfit.name.trim().length > 80)
    throw new Error('Give this outfit a name of 1–80 characters.')
  const top = wardrobe.items.find((item) => item.id === outfit.topItemId)
  const bottom = wardrobe.items.find((item) => item.id === outfit.bottomItemId)
  if (
    !top ||
    !['tops', 'outerwear'].includes(top.category) ||
    !bottom ||
    bottom.category !== 'bottoms'
  )
    throw new Error('Choose an available top and bottom before saving.')
  if (wardrobe.outfits.length >= 500)
    throw new Error('Remove an outfit before adding more than 500.')
  return {
    ...wardrobe,
    outfits: [{ ...outfit, name: outfit.name.trim() }, ...wardrobe.outfits],
  }
}

export interface WardrobeRepository {
  load(): Promise<Wardrobe>
  save(value: Wardrobe): Promise<void>
}
