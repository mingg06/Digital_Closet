import { initialWardrobe, validateItem } from './wardrobe'
import type { Wardrobe, WardrobeRepository } from './wardrobe'

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
  value.items.forEach(validateItem)
  if (new Set(value.items.map((item) => item.id)).size !== value.items.length)
    throw new Error(
      'The local wardrobe has duplicate pieces and could not be read.',
    )
  for (const outfit of value.outfits) {
    if (
      !outfit.id ||
      typeof outfit.name !== 'string' ||
      !value.items.some((item) => item.id === outfit.topItemId) ||
      !value.items.some((item) => item.id === outfit.bottomItemId)
    )
      throw new Error(
        'A saved outfit has missing pieces. Your existing data has not been replaced.',
      )
  }
  return value
}

export const indexedDbRepository: WardrobeRepository = {
  async load() {
    const database = await openDatabase()
    try {
      const value = await new Promise<Wardrobe | undefined>(
        (resolve, reject) => {
          const transaction = database.transaction('wardrobe', 'readonly')
          const request = transaction.objectStore('wardrobe').get('current')
          transaction.oncomplete = () => resolve(request.result)
          transaction.onabort = () =>
            reject(
              new Error(
                'Could not read your local wardrobe. Please try again.',
              ),
            )
        },
      )
      return value === undefined ? initialWardrobe() : validateSnapshot(value)
    } finally {
      database.close()
    }
  },
  async save(value) {
    const database = await openDatabase()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('wardrobe', 'readwrite')
        transaction.objectStore('wardrobe').put(value, 'current')
        transaction.oncomplete = () => resolve()
        transaction.onabort = () =>
          reject(
            new Error(
              'Could not save in this browser. Storage may be full. Free some space and try again; your previous wardrobe is unchanged.',
            ),
          )
      })
    } finally {
      database.close()
    }
  },
}
