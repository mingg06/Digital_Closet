import { initialWardrobe, validateItem } from './wardrobe'
import type { Wardrobe, WardrobeRepository } from './wardrobe'
import { removeLegacySamples } from './legacySamples'

async function openDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB)
    throw new Error(
      'Browser storage is unavailable. Use a browser with IndexedDB enabled.',
    )
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('digital-closet-local', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('wardrobe')
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () =>
      reject(
        new Error(
          'Could not open browser storage. Check your browser storage settings and try again.',
        ),
      )
    request.onblocked = () =>
      reject(new Error('Close other Digital Closet tabs, then try again.'))
  })
}

function validateSnapshot(value: Wardrobe): Wardrobe {
  if (
    value?.version !== 1 ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.outfits) ||
    value.items.length > 500 ||
    value.outfits.length > 500
  )
    throw new Error(
      'The local wardrobe could not be read. Your existing data has not been replaced.',
    )
  try {
    value.items.forEach((item) => {
      if (
        typeof item.id !== 'string' ||
        typeof item.name !== 'string' ||
        typeof item.color !== 'string' ||
        typeof item.image !== 'string' ||
        (item.tags &&
          (!Array.isArray(item.tags) ||
            item.tags.some((tag) => typeof tag !== 'string')))
      )
        throw new Error('Invalid piece')
      validateItem(item)
    })
  } catch {
    throw new Error(
      'The local wardrobe contains unreadable pieces. Your existing data has not been replaced.',
    )
  }
  if (new Set(value.items.map((item) => item.id)).size !== value.items.length)
    throw new Error(
      'The local wardrobe has duplicate pieces and could not be read.',
    )
  for (const outfit of value.outfits) {
    if (
      !outfit.id ||
      typeof outfit.name !== 'string' ||
      !outfit.name.trim() ||
      outfit.name.length > 80 ||
      !Number.isFinite(Date.parse(outfit.createdAt)) ||
      !value.items.some(
        (item) =>
          item.id === outfit.topItemId &&
          ['tops', 'outerwear'].includes(item.category),
      ) ||
      !value.items.some(
        (item) =>
          item.id === outfit.bottomItemId && item.category === 'bottoms',
      )
    )
      throw new Error(
        'A saved outfit has missing pieces. Your existing data has not been replaced.',
      )
  }
  if (
    value.revision !== undefined &&
    (!Number.isInteger(value.revision) || value.revision < 0)
  )
    throw new Error('The local wardrobe version could not be read.')
  return { ...value, revision: value.revision ?? 0 }
}

export const indexedDbRepository: WardrobeRepository = {
  async load() {
    const database = await openDatabase()
    try {
      return await new Promise<Wardrobe>((resolve, reject) => {
        const transaction = database.transaction('wardrobe', 'readwrite')
        const request = transaction.objectStore('wardrobe').get('current')
        let value: Wardrobe
        let readError: unknown
        request.onsuccess = () => {
          try {
            const original = request.result as Wardrobe | undefined
            const cleaned =
              original === undefined
                ? initialWardrobe()
                : removeLegacySamples(original)
            value = validateSnapshot(cleaned)
            if (original !== undefined && cleaned !== original)
              transaction.objectStore('wardrobe').put(value, 'current')
          } catch (error) {
            readError = error
            transaction.abort()
          }
        }
        transaction.oncomplete = () => resolve(value)
        transaction.onabort = () =>
          reject(
            readError ??
              new Error(
                'Could not read your local wardrobe. Please try again.',
              ),
          )
      })
    } finally {
      database.close()
    }
  },
  async save(value) {
    validateSnapshot(value)
    const database = await openDatabase()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('wardrobe', 'readwrite')
        const store = transaction.objectStore('wardrobe')
        const request = store.get('current')
        let conflict = false
        request.onsuccess = () => {
          const saved = request.result as Wardrobe | undefined
          if ((saved?.revision ?? 0) !== value.revision - 1) {
            conflict = true
            transaction.abort()
          } else {
            store.put(value, 'current')
          }
        }
        transaction.oncomplete = () => resolve()
        transaction.onabort = () =>
          reject(
            new Error(
              conflict
                ? 'Your closet changed in another tab. Reload this page before saving again; the other tab’s changes are safe.'
                : 'Could not save in this browser. Storage may be full. Free some space and try again; your previous wardrobe is unchanged.',
            ),
          )
      })
    } finally {
      database.close()
    }
  },
}
