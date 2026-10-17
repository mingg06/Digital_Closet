import type { Wardrobe } from './wardrobe'

// Earlier builds saved bundled illustrations alongside user photos. Only remove
// records still pointing to those illustrations, even if a real upload reused
// one of the old item IDs. This never touches the cloud repository.
export function removeLegacySamples(value: Wardrobe): Wardrobe {
  if (!Array.isArray(value?.items) || !Array.isArray(value?.outfits))
    return value
  const removed = new Set(
    value.items
      .filter(
        (item) =>
          typeof item?.image === 'string' && item.image.startsWith('/samples/'),
      )
      .map((item) => item.id),
  )
  if (!removed.size) return value
  return {
    ...value,
    revision: (value.revision ?? 0) + 1,
    items: value.items.filter((item) => !removed.has(item.id)),
    outfits: value.outfits.filter(
      (outfit) =>
        !removed.has(outfit.topItemId) && !removed.has(outfit.bottomItemId),
    ),
  }
}
